/** @module DeviceMonitorView */
(function () {
    /**
     * @type {webix.protoUI}
     */
    var device_monitor_header = webix.protoUI({
        _last_state: "UNKNOWN",
        name: "device_monitor_header",
        setValues: function (values, force) {
            webix.html.removeCss(this.getNode(), this._last_state, true);
            webix.html.addCss(this.getNode(), this._last_state = values.value, true);
            webix.ui.template.prototype.setValues.call(this, values, force);
        }
    }, webix.ui.template);

    /**
     * @type {webix.protoUI}
     */
    var device_monitor = webix.protoUI({
        _add_scalars: function(scalars){
            this.$$('attributes').parseScalars(scalars);
            this.$$('attributes').addDevice(this.config.device);
            //reshow progress as it is removed by parse
            // this.$$('scalar').showProgress({
            //     type: "icon"
            // });
        },
        /**
         * Loads device attributes
         *
         * @param {TangoDevice} device
         */
        loadAttributes: function (device) {
            console.time('loadAttributes')
            //TODO sync with device.attrs
            return device.fetchAttrs().then(function (attrs) {
                var scalars = attrs.filter(function(attr){
                    return attr.info.data_format === 'SCALAR';
                });

                this._add_scalars(scalars);

                var others = attrs.filter(function(attr){
                    return attr.info.data_format !== 'SCALAR';
                });

                others.forEach(function (attr) {
                    setTimeout(function () {
                        console.time('others');
                        this.addAttribute(attr);
                        console.timeEnd('others');
                    }.bind(this), 10);
                }.bind(this))

                console.timeEnd('loadAttributes');
            }.bind(this))
                .fail(function (err) {
                TangoWebappHelpers.error(err);
            });
        },
        _ui_header: function (device) {
            return {
                rows: [
                    {
                        id: "state",
                        view: "device_monitor_header",
                        template: function(obj){
                            return device.alias + "[" + device.name + "]: " + obj.value;
                        },
                        type: "header",
                        data: {
                            value: "UNKNOWN"
                        }
                    },
                    {
                        view: 'fieldset',
                        label: 'Status',
                        body: {
                            id: 'status',
                            template: "#value#",
                            data: {
                                value: 'N/A'
                            }
                        }
                    }
                ]
            };
        },
        _ui: function (device) {
            return {
                rows: [
                    this._ui_header(device),
                    {view:'resizer'},
                    TangoWebapp.ui.newAttrsMonitorView({
                        id:'attributes',
                        gravity:4
                    })
                ]
            };
        },
        name: "device_monitor",
        $init: function (config) {
            webix.assert(config.device !== undefined, "DeviceMonitor requires device to be defined!");
            webix.extend(config, this._ui(config.device));

            this.$ready.push(function () {
                this.$$('attributes').$$('scalars').hideColumn('device_id');
                this.$$('attributes').$$('scalars').hideColumn('remove');

                this.$$('attributes').$$('scalars').data.attachEvent('onDataUpdate',function(id, update){
                    if(this.config.device.attrs.getItem(id).name === 'State'){
                        this.$$('state').setValues(update);
                    }
                    if(this.config.device.attrs.getItem(id).name === 'Status'){
                        this.$$('status').setValues(update);
                    }
                }.bind(this));

                this.loadAttributes(config.device)
                    .then(function () {
                        this.$$('attributes').start();
                        // return this.run();
                    }.bind(this));
            }.bind(this));

            // this.$ready.push(this.start.mvc_bind(this));
        }
    }, webix.IdSpace, webix.EventSystem,
        TangoWebappPlatform.mixin.DeviceSetter, TangoWebappPlatform.mixin.TabActivator,
        webix.ui.layout);

    TangoWebapp.ui.newDeviceMonitorView = function (config) {
        return {
            header: "<span class='webix_icon fa-eye'></span>[<span class='webix_strong'>" + config.device.display_name + "@" + config.device.host.id + "</span>]",
            close: true,
            borderless: true,
            body: {
                view: "device_monitor",
                id: config.id,
                device: config.device
            }
        }
    };
})();
