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
     *
     * @type {webix.config}
     */
    var scalar_tab = function () {
        return {
            header: "Scalar",
            select: "row", multiselect: true,
            body: {
                view: "datatable",
                resizeColumn: true,
                id: "scalar",
                scheme: {
                    $update: function (item) {
                        if (item.quality === 'FAILURE') item.$css = {"background-color": "red"};
                        else if (item.quality === 'ATTR_ALARM' || item.quality === 'ATTR_INVALID') item.$css = {"background-color": "lightcoral"};
                        else if (item.quality === 'ATTR_WARNING') item.$css = {"background-color": "orange"};
                        else delete item.$css;
                    }
                },
                columns: [
                    {
                        id: "label",
                        header: ["Name", {content: "textFilter"}],
                        width: TangoWebappPlatform.consts.NAME_COLUMN_WIDTH,
                        sort: "string"
                    },
                    {id: "value", header: "Value", width: 200},
                    {
                        id: "stream", header: "", width: 30, template: function (obj) {
                            if (obj._plotted)
                                return "<span class='chart webix_icon fa-times-circle-o'></span>";
                            else
                                return "<span class='chart webix_icon fa-line-chart'></span>";
                        }
                    },
                    {id: "quality", header: "Quality", width: 100, sort: "string"},
                    {id: "unit", header: "Unit", width: TangoWebappPlatform.consts.NAME_COLUMN_WIDTH},
                    {id: "description", header: "Description", fillspace: true}
                ],
                onClick: {
                    "chart": function (event, id) {
                        var attrId = id.row;
                        var item = this.getItem(attrId);
                        var tabId = 'stream-' + item.id;

                        // this.getTopParentView().addTab(tabId, attrId, item);
                        item._plotted = !item._plotted;

                        this.getTopParentView().handlePlot(item);
                    }
                }
            }
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var device_monitor = webix.protoUI({
        _plottedAttributes: null,
        _monitoredAttributes: null,//this is shared object across all components. In this case it is safe, as keys are unique ids
        loadAttributes: function () {
            debugger
            // var $$scalar = this.$$('scalar');
            var $$tabview = this.$$('attributes-tabview');
            var attrTabId;
            this._device.fetchAttrs().then(function (attrs) {
                attrs.map(function (it) {
                    return it.info;
                }).forEach(function (attrInfo, ndx) {
                    switch (attrInfo.data_format) {
                        case "SCALAR":
                            //skip State&Status as they handled differently
                            if (attrInfo.name === 'State' || attrInfo.name === 'Status') return;
                            this.$$('scalar').add({
                                id: attrInfo.name,
                                label: attrInfo.label,
                                value: "N/A",
                                quality: "N/A",
                                unit: attrInfo.unit,
                                description: attrInfo.description
                            });
                            // this.$$('scalar').refresh(attrInfo.name);
                            //TODO save attr list item id for future updates
                            break;
                        case "SPECTRUM":
                            attrTabId = $$tabview.addView({
                                header: attrInfo.label,
                                body: TangoWebapp.ui.newSpectrumView(attrs[ndx])
                            });
                            this._monitoredAttributes[attrTabId] = attrInfo.name;
                            break;
                        case "IMAGE":
                            attrTabId = $$tabview.addView({
                                header: attrInfo.label,
                                body: TangoWebapp.ui.newImageView({
                                    name: attrInfo.label,
                                    value: []
                                })
                            });
                            this._monitoredAttributes[attrTabId] = attrInfo.name;
                            break;
                    }
                }.bind(this));
            }.bind(this)).then(this.start.bind(this)).fail(function () {
                debugger
            });
        },
        handlePlot: function (item) {
            var $$plot = this.$$('scalar-plot');
            if (item._plotted) {
                $$plot.addTrace(item.label, [item.timestamp], [item.value], this._plottedAttributes.length);
                this._plottedAttributes.push(item);
            } else {
                var indexOf = this._plottedAttributes.indexOf(item);
                $$plot.deleteTrace(indexOf);
                this._plottedAttributes.splice(indexOf, 1);
            }
        },
        addTab: function (tabId, attrId, item) {
            if (!(this._monitoredAttributes.hasOwnProperty(tabId))) {
                var $$attrsView = this.getTopParentView().$$('attributes-tabview');
                $$attrsView.addView({
                    id: tabId,
                    width: 300,
                    header: "Stream " + item.label,
                    body: TangoWebapp.ui.newScalarView({
                        id: "stream-" + attrId,
                        value: item.value,
                        timestamp: item.timestamp
                    })
                }, 1);
                this._monitoredAttributes[tabId] = attrId;
            }
            this.$$(tabId).show();
        },
        update: function (what) {
            var $$state = this.$$('state');
            var $$status = this.$$('status');
            return function (attr) {
                //update state and status
                if (attr.name === 'State' && !$$state.$destructed)
                    $$state.setValues(attr, true);
                else if (attr.name === 'Status' && !$$status.$destructed)
                    $$status.setValue(attr.value);
                else
                    what(attr);
            }
        },
        _update: function (tabId) {
            if (tabId === 'scalar') {
                return function (resp) {
                    resp.forEach(this.update(function (attr) {
                        if (!this.$$('scalar').$destructed) {
                            this.$$('scalar').updateItem(attr.name, attr);
                        }
                    }.bind(this)));
                }.bind(this);
            } else {
                return function (resp) {
                    resp.forEach(this.update(function (attr) {
                        if (!this.$$(tabId).$destructed)
                            this.$$(tabId).update(attr);
                    }.bind(this)));

                    this._plottedAttributes.forEach(function (el) {
                        var item = resp.filter(function(el0){
                            return el0.name === el.name
                        });
                        if(item.length === 1) {
                            el.value = item[0].value;
                            el.timestamp = item[0].timestamp;
                        }
                    });
                }.bind(this);
            }
        },
        _update_attrs: function (tabId, attrs) {
            if (tabId === 'scalar') {
                var pull = this.$$('scalar').data.pull;
                for (var id in  pull) {
                    if (!pull.hasOwnProperty(id) || attrs.indexOf(id) > -1) continue;
                    attrs.push(id);
                }
            } else {
                var attr = this._monitoredAttributes[tabId];//TODO get selected tabId
                attrs.push(attr);
            }
        },
        run: function () {
            var attrs = ['State', 'Status'];

            attrs.push.apply(attrs, this._plottedAttributes.map(function (el) {
                return el.name
            }));


            var tabId = this.$$('attributes-tabview').getValue();

            this._update_attrs(tabId, attrs);

            this._device.fetchAttrValues(attrs)
                .then(this._update(tabId, attrs))
                .then(function(){
                    var plotted = this._plottedAttributes;

                    if (plotted.length === 0) return;
                    this.$$('scalar-plot').updateTraces(
                        plotted.map(function (el, ndx) {
                            return ndx;
                        }),
                        plotted.map(function (el) {
                            return el.timestamp;
                        }),
                        plotted.map(function (el) {
                            return el.value;
                        })
                    );
                }.bind(this));
        },
        _ui: function (device) {
            var top = this;

            return {
                rows: [
                    {
                        cols: [
                            {
                                id: "state",
                                view: "device_monitor_header",
                                template: "#alias# [#devname#] -- #value#",
                                type: "header",
                                data: {
                                    devname: device.name,
                                    alias: device.alias,
                                    value: "UNKNOWN"
                                }
                            },
                            {
                                width: 15
                            },
                            {
                                view: "form",
                                id: "frmUpdateRate",
                                width: 320,
                                elements: [{
                                    cols: [
                                        {
                                            view: "text",
                                            label: "Update rate (ms):",
                                            labelWidth: 120,
                                            value: top._delay,
                                            name: "updateRate",
                                            validate: webix.rules.isNumber
                                        },
                                        {
                                            view: "button",
                                            type: "iconButton",
                                            icon: "check",
                                            width: 36,
                                            click: function () {
                                                var form = this.getFormView();
                                                if (form.validate()) {
                                                    top.changeDelay(form.getValues().updateRate);
                                                }
                                            }
                                        },
                                        {
                                            view: "button",
                                            type: "iconButton",
                                            icon: "pause",
                                            width: 36,
                                            click: function (id, ev) {
                                                var top = this.getTopParentView();
                                                if (this.config.icon === "pause") {
                                                    top.stop();
                                                } else {
                                                    top.start();
                                                }
                                                this.define("icon", this.config.icon === "pause" ? "play" : "pause");
                                                this.refresh();
                                            }
                                        }
                                    ]
                                }
                                ]
                            },
                            {
                                width: 10
                            }
                        ]
                    },
                    {
                        cols: [{
                            view: "fieldset",
                            label: "Status:",
                            minHeight: 250,
                            minWidth: 50,
                            body: {
                                view: "textarea",
                                id: "status",
                                minHeight: 50,
                                value: "Device is in UNKNOWN state"
                            }
                        },
                            {view: "resizer"},
                            TangoWebapp.ui.newScalarView(
                                {
                                    gravity: 4,
                                    id: 'scalar-plot',
                                    empty: true
                                })
                        ]
                    },
                    {view: "resizer"},
                    {
                        view: "tabview",
                        gravity: 4,
                        animate: false,
                        fitBiggest: true,
                        id: "attributes-tabview",
                        cells: [
                            scalar_tab()
                        ]
                    }
                ]
            };
        },
        name: "device_monitor",
        $init: function (config) {
            webix.extend(config, this._ui(config.device));

            this.$ready.push(function () {
                this._plottedAttributes = [];
                this._monitoredAttributes = {};

                this.loadAttributes();
            }.bind(this));

            // this.$ready.push(this.start.mvc_bind(this));
        }
    }, webix.IdSpace, webix.EventSystem,
        TangoWebappPlatform.mixin.DeviceSetter, TangoWebappPlatform.mixin.TabActivator, TangoWebappPlatform.mixin.Runnable,
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
