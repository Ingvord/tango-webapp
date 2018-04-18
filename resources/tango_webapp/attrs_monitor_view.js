/**
 * @module AttrsMonitorView
 */
(function () {
    /**
     *
     * @return {} toolbar
     */
    newToolbar = function(){
        return {
            view: "toolbar",
            height: 40,
            cols: [
                {view: "counter", id: "refresh", step: 100, value: 1000, min: 100, max: 100000, width: 90},
                {
                    view: "button",
                    type: "iconButton",
                    icon: "refresh",
                    align: 'right',
                    width: 30,
                    click: function () {
                        this.getTopParentView()._delay = this.getTopParentView().$$("refresh").getValue();
                        if (this.getTopParentView().isRunning()) {
                            this.getTopParentView().stop();
                            this.getTopParentView().start();
                        }
                    }
                },
                {
                    view: "toggle",
                    id: "startStop",
                    type: "iconButton",
                    offIcon: "play",
                    onIcon: "pause",
                    align: 'right',
                    width: 30,
                    click: function () {
                        if (this.getValue()) {
                            this.getTopParentView().stop();
                        } else {
                            this.getTopParentView().start();
                        }
                    }
                },
                {}
            ]
        };
    };

    newScalarsPlot = function(){
        return {
            view: 'fieldset',
            label: "Scalar plot",
            body: TangoWebapp.ui.newScalarView({
                id: 'plot',
                empty: true
            })
        }
    };


    /**
     * @type {webix.protoUI}
     */
    var scalars = webix.protoUI({
        name: 'scalars',
        _config: function () {
            return {
                scheme: {
                    value: NaN,
                    quality: 'N/A',
                    timestamp: new Date(NaN),
                    plotted: false,
                    plotIndex: undefined,
                    $update: function (item) {
                        if (item.quality === 'FAILURE') item.$css = {"background-color": "red"};
                        else if (item.quality === 'ATTR_ALARM' || item.quality === 'ATTR_INVALID') item.$css = {"background-color": "lightcoral"};
                        else if (item.quality === 'ATTR_WARNING') item.$css = {"background-color": "orange"};
                        else delete item.$css;
                    }
                },
                columns: [
                    {
                        id: 'device_id',
                        // header: ["Device", {content: "textFilter"}], //TODO custom filter https://docs.webix.com/datatable__headers_footers.html#customheaderandfootercontent
                        header: "Device",
                        width: TangoWebappPlatform.consts.NAME_COLUMN_WIDTH,
                        sort: "string",
                        template:function(obj){
                            return PlatformContext.devices.getItem(obj.device_id).display_name;
                        }
                    },
                    {
                        id: "label",
                        header: ["Attribute", {content: "textFilter"}],
                        width: TangoWebappPlatform.consts.NAME_COLUMN_WIDTH,
                        sort: "string"
                    },
                    {id: "value", header: "Value", width: 200},
                    {
                        id: "stream", header: "", width: 30, template: function (obj) {
                            if (obj.plotted)
                                return "<span class='chart webix_icon fa-times-circle-o'></span>";
                            else
                                return "<span class='chart webix_icon fa-line-chart'></span>";
                        }
                    },
                    {id: "quality", header: "Quality", width: 180, sort: "string"},
                    {
                        id: "timestamp", header: "Last updated", width: 180, template: function (obj) {
                            return TangoWebappPlatform.consts.LOG_DATE_FORMATTER(new Date(obj.timestamp));
                        }
                    },
                    {id: "unit", header: "Unit", width: 60},
                    {id: "description", header: "Description", fillspace: true}
                ]
            }
        },
        /**
         * @param {TangoAttribute} attr
         */
        addAttribute: function (attr) {
            webix.assert(attr.info.data_format === 'SCALAR', "data_format must be SCALAR!");

            this.add({
                id: attr.id,
                device_id: attr.device_id,
                label: attr.info.label,
                unit: attr.info.unit,
                description: attr.info.description
            });

            this.hideOverlay();
        },
        /**
         * @param
         */
        update: function (attrs) {
            this.parse(attrs);
        },
        $init: function (config) {
            webix.extend(config, this._config());
            this.$ready.push(function () {
                this.showOverlay("No data...");
            }.bind(this));
        },
        defaults: {
            select: true,
            resizeColumn: true,
            on: {
                "onAfterSelect":function(id){
                    var item = this.getItem(id.id);


                    PlatformContext.devices.setCursor(item.device_id);

                    OpenAjax.hub.publish("tango_webapp.item_selected", {
                        data: {
                            id: id.id,
                            kind: 'attrs',
                            values: PlatformContext.devices.getItem(item.device_id)
                        }
                    });
                }
            }
        }
    }, webix.EventSystem, webix.OverlayBox, webix.ui.datatable);

    newScalars = function(){
        return {
            view: 'scalars',
            id: 'scalars',
            onClick: {
                "chart": function (event, id) {
                    var attrId = id.row;
                    var item = this.getItem(attrId);
                    // this.getTopParentView().addTab(tabId, attrId, item);
                    if(item.plotted){
                        this.getTopParentView().stopPlot(item);
                    } else {
                        this.getTopParentView().startPlot(item);
                    }

                    return false;
                }
            }
        };
    };

    newAttributes = function(){
        return {
            view: 'tabview',
            gravity: 2,
            id: 'attributes',
            cells: [
                {
                    header: "Scalars",
                    body: newScalars()
                }
            ]
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var attrs_monitor_view = webix.protoUI({
        name: 'attrs_monitor',
        _monitored: null,
        _plotted: null,
        _devices: null,
        _plotIndex: 0, //TODO is this shared?
        _add_attr: function (attr) {
            if (attr.info.data_format === 'SPECTRUM') {
                this.$$('attributes').addView({
                    header: attr.info.label,
                    body: TangoWebapp.ui.newSpectrumView(attr)
                });
            } else if (attr.info.data_format === 'IMAGE') {
                this.$$('attributes').addView({
                    header: attr.info.label,
                    body: TangoWebapp.ui.newImageView(attr)
                });
            }
        },
        /**
         *
         * @param {} item
         */
        startPlot:function(item){
            var $$plot = this.$$('plot');
            var $$scalars = this.$$('scalars');

            $$scalars.updateItem(item.id, {
                plotted: true,
                plotIndex: this._plotIndex++
            });

            $$plot.addTrace(item.label, [item.timestamp], [item.value], item.plotIndex);
        },
        /**
         *
         * @param item
         */
        stopPlot:function(item){
            var $$plot = this.$$('plot');
            var $$scalars = this.$$('scalars');

            var index = item.plotIndex;

            $$plot.deleteTrace(index);

            $$scalars.updateItem(item.id, {
                plotted: false,
                plotIndex: undefined
            });

            //TODO replace plotted with array?
            TangoWebappHelpers.iterate(this._plotted, function(plotted){
                if(plotted.plotIndex >= index) plotted.plotIndex--;
            });

            this._plotIndex--;
        },
        /**
         *
         */
        update: function (attrs) {
            attrs.forEach(function (attr) {
                if (this.$$('attributes').getTabbar().getValue() === 'scalars') {
                    this.$$('scalars').updateItem(attr.id, attr);
                } else {
                    this.$$(attr.id).update(attr);
                }
            }, this);

            if (this._plotted.count() === 0) return;

            var plotted =[];
            TangoWebappHelpers.iterate(this._plotted, function(scalar){
                plotted.push(scalar);
            });
            this.$$('plot').updateTraces(
                plotted.map(function (el) {
                    return el.plotIndex;
                }),
                plotted.map(function (el) {
                    return el.timestamp;
                }),
                plotted.map(function (el) {
                    return el.value;
                })
                );
        },
        run: function () {
            var attrs_to_update = [];
            TangoWebappHelpers.iterate(this._plotted, function (plotted) {
                attrs_to_update.push(
                    this._monitored.getItem(plotted.id));
            }.bind(this));

            if (this.$$('attributes').getTabbar().getValue() === 'scalars') {
                TangoWebappHelpers.iterate(this.$$('scalars').data, function (scalar) {
                    if (!scalar.plotted) attrs_to_update.push(this._monitored.getItem(scalar.id));
                }.bind(this));
            } else {
                attrs_to_update.push(
                    this._monitored.getItem(this.$$('attributes').getTabbar().getValue()));
            }

            for (var device_id in this._devices) {
                var device = PlatformContext.devices.getItem(device_id);

                var filtered_attrs_to_update = attrs_to_update
                    .filter(function (attr_to_update) {
                        return attr_to_update.device_id === device.id;
                    });
                
                if(filtered_attrs_to_update.length !== 0)
                    device.fetchAttrValues(filtered_attrs_to_update
                        .map(function (attr_to_update) {
                            return attr_to_update.name;
                        })).then(function (filtered_attrs_to_update, resp) {
                            this.update(filtered_attrs_to_update.map(function (filtered_attr_to_update, ndx) {
                                return MVC.Object.extend(filtered_attr_to_update, resp[ndx]);
                            }));
                    }.bind(this, filtered_attrs_to_update.slice()));
            }
        },
        /**
         *
         * @param {TangoAttribute} attr
         * @return boolean
         */
        addAttribute: function (attr) {
            if (this._monitored.getItem(attr.id) !== undefined) return false;

            attr = attr.attributes();
            this._monitored.add(attr);

            if (attr.info.data_format !== 'SCALAR') {
                this._add_attr(attr);
            } else {
                this.$$('scalars').addAttribute(attr);
            }

            this._devices[attr.device_id] = PlatformContext.devices.getItem(attr.device_id); //sync filtered?

            return true;
        },
        /**
         *
         * @param {TangoAttribute} attr
         */
        removeAttribute:function(attr){
            //TODO
        },
        _ui: function () {
            return {
                rows: [
                    newScalarsPlot(),
                    {
                        view: 'resizer'
                    },
                    newAttributes(),
                    newToolbar()
                ]
            }
        },
        $init: function (config) {
            webix.extend(config, this._ui());

            this._devices = Object.create(null);
            this._monitored = new webix.DataCollection();
            this._plotted = new webix.DataCollection();

            this.$ready.push(function () {
                this._plotted.sync(this.$$('scalars').data, function () {
                    this.filter(function (obj) {
                        return obj.plotted;
                    })
                });
            }.bind(this));
        }
    },
        TangoWebappPlatform.mixin.Runnable,
        webix.EventSystem, webix.IdSpace,
        webix.ui.layout);

    TangoWebapp.ui.newAttrsMonitorView = function (context) {
        return {
            view: "attrs_monitor",
            id: context.id
        }
    };

    var AttrsMonitorState = TangoWebappPlatform.WidgetState.extend(
        {
            init:function(attrs){
                attrs.data = attrs.data || Object.create(null);
                this._super(attrs);
            },
            /**
             * @return {Array}
             */
            asIdArray:function(){
                var result = [];
                for(var id in this.data)
                    result.push(id);
                return result;
            },
            updateState:function(id, plotted){
                var item = Object.create(null);
                item[id] = plotted;
                this._super(item);
            }
        }
        );

    /**
     * @type {webix.protoUI}
     */
    var stateful_attrs_monitor = webix.protoUI({
        name:'stateful_attrs_monitor',
        /**
         *
         * @param {AttrsMonitorState} state atributes' names
         */
        restoreState:function(state){
            var parsedIds = state.asIdArray().map(function(id){
                return TangoAttribute.parseId(id);
            });

            //unique host -> unique devices
            var unique_hosts = Object.create(null);
            parsedIds.forEach(function(id){
                if(unique_hosts[id.host] === undefined)
                    unique_hosts[id.host] = Object.create(null);

                unique_hosts[id.host][id.device] = null;
            });


            var self = this;
            for(var host in unique_hosts)
                for (var device in unique_hosts[host])
                    (function(host, device) {
                        PlatformContext.rest.fetchHost(host)
                            .then(function (host) {
                                return host.fetchDevice(device);
                            })
                            .then(function (device) {
                                return device.fetchAttrs();
                            })
                            .then(function (attrs) {
                                var ids = state.asIdArray();
                                attrs.filter(function (attr) {
                                    return ids.indexOf(attr.id) > -1;
                                }).forEach(function (attr) {
                                    webix.ui.attrs_monitor.prototype.addAttribute.apply(self, arguments);
                                    if(state.data[attr.id])
                                        webix.ui.attrs_monitor.prototype.startPlot.call(self, self.$$('scalars').getItem(attr.id));
                                });
                            })
                            .fail(function(err){
                                TangoWebappHelpers.error(err);
                            })

                    })(host, device);
        },
        /**
         * Overrides attrs_monitor_view.addAttribute by adding state update
         *
         * @param {TangoAttribute} attr
         */
        addAttribute:function(attr){
            if(webix.ui.attrs_monitor.prototype.addAttribute.apply(this, arguments)) {
                this.state.updateState(attr.id, false);
            }
        },
        startPlot:function(item){
            webix.ui.attrs_monitor.prototype.startPlot.apply(this, arguments);
            this.state.updateState(item.id, true);
        },
        stopPlot:function(item){
            webix.ui.attrs_monitor.prototype.stopPlot.apply(this, arguments);
            this.state.updateState(item.id, false);
        },
        $init:function(config){
            this.$ready.push(function(){
                this.state = AttrsMonitorState.find_one(this.config.id);
                if(this.state !== null)
                    this.restoreState(this.state);
                else
                    this.state = new AttrsMonitorState({
                        id: this.config.id
                    })
            }.bind(this));
        }
    },attrs_monitor_view);

    TangoWebapp.ui.newStatefulAttrsMonitorView = function (config) {
        return webix.extend(config, {
            view: "stateful_attrs_monitor"
        });
    }
})();