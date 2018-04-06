/**
 *
 * @type {TangoHost}
 */
TangoWebappPlatform.TangoHost = MVC.Model.extend("tango_host",
    /** @Static */
    {
        store_type: WebixDataCollectionStorage,
        attributes: {
            host: "string",
            port: "number",
            name: "string",
            id: "string", //host:port
            info: "string[]",
            is_alive: 'boolean'
        },
        default_attributes: {
            host: 'unknown',
            port: undefined,
            name: 'unknown',
            info: [],
            is_alive: false
        }
    },
    /** @Prototype */
    {
        rest: null,
        database: null,
        toString: function () {
            return this.id;
        },
        toUrl: function () {
            return this.host + "/" + this.port;
        },
        /**
         *
         * @event {OpenAjax} tango_webapp.device_loaded
         *
         * @param name
         * @return {Promise} device
         */
        fetchDevice: function (name) {
            return this.fetchDatabase()
                .then(function (db) {
                    return webix.promise.all(
                        [
                            db.getDeviceInfo(name),
                            db.getDeviceAlias(name).fail(function(){
                                return "";
                            })
                        ]);
                })
                .then(function (info) {
                    var device = new TangoWebappPlatform.TangoDevice({
                        info: info[0],
                        alias: info[1],
                        id: this.id + "/" + name,
                        name: name,
                        host: this
                    });
                    OpenAjax.hub.publish("tango_webapp.device_loaded", {data: device});
                    return device;
                }.bind(this));
        },
        /**
         *
         * @event {OpenAjax} tango_webapp.database_loaded
         * @return {Promise} database
         */
        fetchDatabase: function () {
            return this.rest.request().hosts(this.toUrl()).devices(this.name).get()
                .then(function (resp) {
                        //jmvc fails to set "attributes" due to already existing function in the model
                        delete resp.attributes;

                        var device = TangoWebappPlatform.TangoDevice.create_as_existing(MVC.Object.extend(resp, {
                            id: this.id + "/" + this.name,
                            name: this.name,
                            host: this
                        }));

                    this.is_alive = true;
                    this.errors = [];
                    OpenAjax.hub.publish("tango_webapp.tango_host_loaded", {data: this});
                        return device;
                    }.bind(this)
                ).fail(function (resp) {
                    this.is_alive = false;
                        this.add_errors(resp.errors);
                        throw resp;
                    }.bind(this)
                ).then(function (device) {
                    this.database = new TangoWebappPlatform.TangoDatabase({
                        id: device.id,
                        device: device,
                        info: this.info
                    });
                    OpenAjax.hub.publish("tango_webapp.database_loaded", {data: this.database});
                    return this.database;
                }.bind(this));
        }
    }
);

//TODO move to separate file: compatibility
if (window['TangoHost'] === undefined)
    TangoHost = TangoWebappPlatform.TangoHost;