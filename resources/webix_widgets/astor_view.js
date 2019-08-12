import {_ui} from "./astor_view_ui.js";

const as_array = true;

class TangoServer {
    constructor(name, state, level, device) {
        this.id = name;
        this.name = name;
        this._level = level;
        this._state = state;
        this.device = device;
    }

    get level() {
        return this._level === "0" ? "Not controlled" : this._level;
    }

    get state() {
        switch (this._state) {
            case "MOVING":
                return "STARTING/STOPPING";
            case "FAULT":
                return "NOT RUNNING/UNKNOWN";
            default:
                return "RUNNING";
        }
    }
}

class TangoAdmin {
    constructor(id, name, promiseDevice) {
        this.id = id;
        this.name = name;
        this.state = -1;//see esrf.DevState.java
        this.promiseDevice = promiseDevice;
        this.servers = [];
    }
}

class TangoDevice {
    constructor(clazz, name, server) {
        this.clazz = clazz;
        this.name = name;
        this.server = server;
    }
}



/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 4/28/19
 */
const astor = webix.protoUI({
    name: 'astor',
    tango_host: null,
    starter: null,
    cleanSubscriptions() {
        this.$$('hosts').data.each(admin => {
            PlatformContext.subscription.unsubscribe({
                host: this.tango_host.id,
                device: admin.id,
                attribute: "Servers",
                type: "change"
            });
        });

    },
    async _update_log() {
        this.$$('log').clearAll();
        this.$$('log').parse(
            (await this.starter.fetchCommand("DevReadLog")).execute("Starter")
                .then(resp => resp.output.split("\n").map(value => ({value}))
                ));
    },
    initializeSubscription(admin){
        PlatformContext.subscription.subscribe({
                host: this.tango_host.id,
                device: `tango/admin/${admin.name}`,
                attribute: "Servers",
                type: "change"
            },(event)=>{
            this._update_hosts();
            this._update_servers(event.data.map(el => el.split("\t")));
            this.$$("servers").getSelectedItem(as_array).forEach(server =>
                this._update_devices(server)
            );
            this._update_log();
        },(error)=>{
            TangoWebappHelpers.error(error);
        });
    },
    /**
     *
     * @param {TangoAdmin} admin
     * @return {Promise<void>}
     */
    async initializeAdmin(admin){
        try {
            this.starter = await this.tango_host.fetchDevice(`tango/admin/${admin.name}`);
        } catch (e) {
            //TODO show overlay - starter is not defined
            TangoWebappHelpers.error("Starter is not installed or host name does not match!", e);
            this.disable();
            return;
        }

        this.$$('servers').clearAll();
        this.$$('servers').parse(
            (await this.starter.fetchAttr("Servers")).read()
                .then(v => v.value.map(el => el.split("\t")))
                .then(values => values.map(([name, state, controlled, level]) => new TangoServer(name, state, level, this.tango_host.fetchDevice(`dserver/${name}`)))));

        this._update_log();

        this._update_hosts();

        this.initializeSubscription(admin);
    },
    async initialize() {
        this.enable();
        this.$$('header').setValues(this.tango_host);
        if (this.tango_host && this.starter) this.cleanSubscriptions();

        this.$$('servers').clearAll();
        this.$$('hosts').clearAll();
        this.$$('hosts').parse(
            this.tango_host.fetchDatabase()
                .then(db => db.getDeviceMemberList('tango/admin/*'))
                .then(resp => resp.output.map(name => new TangoAdmin(`${this.tango_host.id}/tango/admin/${name}`,name, this.tango_host.fetchDevice(`tango/admin/${name}`))))
                .then(admins => {
                    if(admins.length > 0)
                        return admins;
                    else
                        throw new Error(`Tango host ${this.tango_host.name} does not have any admin devices!`);
                })
                .fail(err => {
                    TangoWebappHelpers.error("Failed to load Tango admin(s)!", err);
                    this.disable()
                })
        );


    },
    _update_hosts() {
        this.$$('hosts').data.each(admin => {
            admin.promiseDevice.then(device => device.fetchAttrValue("HostState")
                .then(v => this.$$('hosts').updateItem(admin.id, {state: v})))
        });
    },
    _update_servers(values) {
        const servers = values.map(([name, state, controlled, level]) => new TangoServer(name, state, level, this.tango_host.fetchDevice(`dserver/${name}`)));
        servers.forEach(server => this.$$('servers').updateItem(server.id, server));
    },
    _update_devices(server){
        const $$devices = this.$$('devices');
        $$devices.config.server = server;
        $$devices.clearAll();
        return server.device
            .then(device => {
                return device.executeCommand("QueryDevice");
            }).then(resp => {
                $$devices.parse(resp.output.map(el => new TangoDevice(el.split("::")[0], el.split("::")[1], server.name)));
            }).fail((err) => {
                TangoWebappHelpers.error(`Failed to query device for server ${server.name}`, err)
            });
    },
    async run() {
        this._update_hosts();

        if (this.starter != null) {
            (await this.starter.fetchAttr("Servers")).read()
                .then(v => this._update_servers(v.value.map(el => el.split("\t"))));
            this.$$("servers").getSelectedItem(as_array).forEach(server =>
                this._update_devices(server)
            );
            this._update_log();
        }
    },
    _execute_for_all(cmdName) {
        webix.promise.all(
            this.$$('servers').getSelectedItem(as_array)
                .map(async server => {
                    const cmd = await this.starter.fetchCommand(cmdName);
                    UserAction.executeCommand(cmd, server.name);
                })).then(() => this.run());
    },
    devKill() {
        this._execute_for_all("HardKillServer");
    },
    devStop() {
        this._execute_for_all("DevStop");
    },
    devStart() {
        this._execute_for_all("DevStart");
    },
    devAdd(name, clazz) {
        const $$devices = this.$$('devices');
        const server = $$devices.config.server;
        if (server != null)
            OpenAjax.hub.publish("tango_webapp.device_add", {
                data: {
                    device: {
                        server: server.name,
                        name,
                        clazz
                    },
                    host: this.tango_host
                }
            });
    },
    devRestart() {
        const $$devices = this.$$('devices');
        $$devices.getSelectedItem(as_array)
            .forEach(async dev => {
                const cmd = await (await $$devices.config.server.device).fetchCommand("DevRestart");
                UserAction.executeCommand(cmd, dev.name);
            });
    },
    devRemove() {
        this.$$('devices').getSelectedItem(as_array)
            .forEach(async dev => {
                const db = await this.tango_host.fetchDatabase();
                db.deleteDevice(dev.name).then(function () {
                    OpenAjax.hub.publish("tango_webapp.device_delete", {
                        data: {
                            device: dev
                        }
                    });
                })
                    .then(() => {
                        this.$$('devices').remove(dev.id);
                    })
                    .fail(TangoWebappHelpers.error)
            });
    },
    $init(config) {
        webix.extend(config, _ui());

        this.$ready.push(() => {
            this.$$('info').bind(config.context.devices);
            this.$$('frmNewDevice').bind(this.$$("devices"));
            //TODO bind devices to servers
        });
    },
    defaults: {
        on: {
            "tango_webapp.item_selected subscribe": function (event) {
                if (event.data.kind !== "tango_host" || (this.tango_host && this.tango_host.id === event.data.id)) return;
                this.tango_host = TangoHost.find_one(event.data.id);
                this.initialize();
            }
        }
    }
}, TangoWebappPlatform.mixin.OpenAjaxListener, TangoWebappPlatform.mixin.Runnable, webix.IdSpace, webix.ui.layout);


TangoWebapp.ui.newAstorTab = function (context) {
    return {
        header: "<span class='webix_icon fa-tasks'></span> Manager",
        close: true,
        borderless: true,
        body: {
            view: 'astor',
            id: 'astor',
            context
        }
    }
};

