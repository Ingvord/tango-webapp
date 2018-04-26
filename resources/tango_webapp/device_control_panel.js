/** @module TestDevicePanel */
(function () {
    var attr_info_values = [
        'label','writable','data_format','data_type','max_dim_x','max_dim_y','unit','standard_unit',
        'display_unit','format','min_value','max_value'];

    /**
     *
     * @type {webix.config}
     */
    var attr_info_datatable = {
        id: 'info',
        view: 'datatable',
        header:false,
        columns:[
            {id:'info' },
            {id:'value', fillspace: true}
        ],
        on:{
            onBindApply:function(attr){
                if(!attr) return false;
                var info = [];
                info.push({info:'Name', value: attr.name});
                attr_info_values.forEach(function(el){
                    info.push({info:MVC.String.classize(el), value: attr.info[el]})
                });
                this.parse(info);
            }
        }
    };

    var commands_info_datatable = {
        view: 'form',
        id: 'info',
        elements:[{
            cols: [{
                view:'fieldset',
                label: 'Input',
                body:{
                    rows:[
                        {
                            view: 'label',
                            name:'in_type'
                        },
                        {
                            view: 'textarea',
                            name:'in_type_desc'
                        }
                    ]
                }
            },
                {
                    view:'fieldset',
                    label: 'Output',
                    body:{
                        rows:[
                            {
                                view: 'label',
                                name:'out_type'
                            },
                            {
                                view: 'textarea',
                                name:'out_type_desc'
                            }
                        ]
                    }
                }]
        }
        ],
        on:{
            /**
             *
             * @param {TangoCommand} cmd
             * @returns {boolean}
             */
            onBindApply:function(cmd){
                if(!cmd) return false;
                this.setValues(cmd.info);
            }
        }
    };

    /**
     * @type {webix.ui.config}
     */
    var synchronizer = {
        _what: null,
        _command: null,
        synchronize: function (device) {
            TangoWebappHelpers.debug("device[" + device.id + "]." + this._what + ".count=" + device[this._what].count());
            this.$$('list').unselect();
            if (device[this._what].count() === 0) {
                this.showProgress({
                    type: "icon"
                });
                device[this._command]().then(function (items) {
                    importData(this.$$('list'), device[this._what]);
                    this.hideProgress();
                }.bind(this))
            } else {
                importData(this.$$('list'), device[this._what]);
                this.elements.name.setValue('');//drop currently selected item
            }
        },
        $init: function (config) {
            this._what = config.id;
            this._command = 'fetch' + MVC.String.classize(this._what);
        }
    };

    /**
     *
     * @return {Function}
     */
    var importData = function($$list, data) {
            $$list.data.importData(data);
            $$list.sort("#display_name#","asc","string");
    };

    /**
     * @type {webix.protoUI}
     */
    var test_device_commands = webix.protoUI({
        name: 'device_panel_commands',
        _execute_command: function () {
            var command = this.$$('list').getSelectedItem();
            var argin = this.elements.argin.getValue();

            UserAction.executeCommand(command, argin)
                .then(function (resp) {
                    if (!resp.output) resp.output = "";
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_command_out.ejs'}).render(resp));
                }.bind(this))
                .fail(error_handler.bind(this));
        },
        _ui: function () {
            return {
                elements: [
                    filter,
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        gravity: 2,
                        template: "#display_name#"
                    },
                    {
                        view: 'text',
                        type: 'hidden',
                        height: 2,
                        name: 'name',
                        validate: webix.rules.isNotEmpty,
                        invalidMessage: 'Command must be selected from the list'
                    },
                    commands_info_datatable,
                    {
                        view: 'text',
                        name: 'argin',
                        placeholder: 'Input e.g. 3.14 or [3.14, 2.87] etc'
                        //TODO argin converter
                    },
                    {
                        view: 'button',
                        name: 'btnExecCmd',
                        value: 'Execute',
                        click: function () {
                            var form = this.getFormView();
                            if (form.validate()) {
                                form._execute_command();
                            }
                        }
                    }
                ]
            }
        },
        $init: function (config) {
            webix.extend(config, this._ui());
            this.$ready.push(function () {
                this.bind(this.$$('list'));
                this.$$('info').bind(this.$$('list'));
            }.bind(this));
        },
        defaults: {
            complexData: true,
            on: {
                onBindApply: function () {
                    var command = this.$$('list').getSelectedItem();
                    if (!command) return;

                    this.clearValidation();

                    if (command.info.in_type !== 'DevVoid') {
                        this.elements.argin.define({
                            validate: webix.rules.isNotEmpty,
                            invalidMessage: 'Input argument can not be empty'
                        });
                    } else {
                        this.elements.argin.define({validate: '', invalidMessage: 'Input argument can not be empty'});
                    }
                }
            }
        }
    }, synchronizer, webix.ProgressBar, webix.IdSpace, webix.ui.form);

    var filter = {
        view: 'text',
        value: '',
        placeholder: 'type to filter',
        label: '<span class="webix_icon fa-filter"></span>',
        labelWidth: 20,
        on: {
            onTimedKeyPress: function () {
                this.getFormView().$$("list").filter("#name#", this.getValue());
            }
        }
    };

    //TODO make instance functions
    var openTab = function (view, resp) {
        var $$tab = $$(this.id);
        if (!$$tab) {
            var device = PlatformContext.devices.getItem(this.device_id);
            PlatformApi.PlatformUIController().openTangoHostTab(device.host, view);

            $$tab = $$(this.id);
        }

        $$tab.show();
        $$tab.update(resp);
    };

    //TODO send Open Ajax event and handle it in main_controller
    var openSpectrumWindow = function (resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-area-chart'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newSpectrumView(this)
        }, resp);
    };

    //TODO send Open Ajax event and handle it in main_controller
    var openImageWindow = function (resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-image'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newImageView(webix.extend({id: this.id}, resp))
        }, resp);
    };

    var openScalarWindow = function(resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-at'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newScalarView(webix.extend({id: this.id}, resp))
        }, resp)
    };

    var attr_output_handler = function (resp) {
        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_attribute_out.ejs'}).render(resp));
    };

    var error_handler = function (resp) {
        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_error_out.ejs'}).render(resp));
        //clear errors
        resp.errors.length = 0;
    };

    /**
     * @type {webix.protoUI}
     */
    var test_device_attributes = webix.protoUI({
        name: 'device_panel_attributes',
        _read: function () {
            var attribute = this.$$('list').getSelectedItem();


            UserAction.readAttribute(attribute)
                .then(attr_output_handler.bind(this))
                .fail(error_handler.bind(this));
        },
        _write: function () {
            var attribute = this.$$('list').getSelectedItem();

            var v = this.elements.w_value.getValue();

            UserAction.writeAttribute(attribute, v)
                .then(attr_output_handler.bind(this))
                .fail(error_handler.bind(this));

        },
        _plot: function () {
            var attribute = this.$$('list').getSelectedItem();

            if (attribute.info.data_format === "SPECTRUM") {
                UserAction.readAttribute(attribute)
                    .then(openSpectrumWindow.bind(attribute))
                    .fail(error_handler.bind(this));
            } else if (attribute.info.data_format === "IMAGE") {
                UserAction.readAttribute(attribute)
                    .then(openImageWindow.bind(attribute))
                    .fail(error_handler.bind(this));
            } else if (attribute.info.data_format === "SCALAR") {
                UserAction.readAttribute(attribute)
                    .then(openScalarWindow.bind(attribute))
                    .fail(error_handler.bind(this));
            } else {
                TangoWebappHelpers.error("Unsupported data format: " + attribute.info.data_format);
            }
        },
        _plot_history:function(){
            var attribute = this.$$('list').getSelectedItem();

            UserAction.readAttributeHistory(attribute)
                .then(function(attr){
                    attr.value = attr.history.pop();
                    return attr;
                })
                .then(openScalarWindow.bind(attribute))
                .then(function(){
                    var $$plot = $$(attribute.id);
                    $$plot.updateMulti(attribute.history);
                })
                .fail(error_handler.bind(this));
        },
        _ui: function () {
            return {
                elements: [
                    filter,
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        template: "#display_name#"
                    },
                    {
                        view: 'text',
                        type: 'hidden',
                        height: 2,
                        name: 'name',
                        validate: webix.rules.isNotEmpty,
                        invalidMessage: 'Attribute must be selected from the list'
                    },
                    attr_info_datatable,
                    {
                        cols: [
                            {
                                view: 'button',
                                name: 'btnRead',
                                value: 'Read',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._read();
                                    }
                                }
                            },
                            {
                                view: 'button',
                                name: 'btnPlot',
                                disabled: true,
                                value: 'Plot',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._plot();
                                    }
                                }
                            },
                            {
                                view: 'button',
                                name: 'btnPlotHist',
                                disabled: true,
                                value: 'Plot.Hist',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._plot_history();
                                    }
                                }
                            }]
                    },
                    {
                        cols:[
                            {
                                view: 'button',
                                name: 'btnWrite',
                                disabled: true,
                                value: 'Write',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._write();
                                    }
                                }
                            },{
                                view: 'text',
                                name: 'w_value',
                                placeholder: 'attribute value',
                                gravity:2
                            }
                        ]
                    }
                ]
            }
        },
        $init: function (config) {
            webix.extend(config, this._ui());

            this.$ready.push(function () {
                this.bind(this.$$('list'));
                this.$$('info').bind(this.$$('list'));
            }.bind(this));
        },
        defaults: {
            on: {
                onBindApply: function (obj, dummy, master) {
                    if (!obj) return this.clear();

                    var info;
                    try {
                        info = new View({url: 'views/dev_panel_attribute_info.ejs'}).render(obj.info);
                    } catch (e) {
                        info = "Failed to parse attribute.info: " + e;
                    }
                    this.elements['btnPlot'].enable();
                    if(obj.isScalar()){
                        this.elements['btnPlotHist'].enable();
                    }
                    if (obj.info.writable.includes("WRITE"))
                        this.elements['btnWrite'].enable();
                    else
                        this.elements['btnWrite'].disable();
                }
            }
        }
    }, synchronizer, webix.ProgressBar, webix.IdSpace, webix.ui.form);

    /**
     * @type {webix.protoUI}
     */
    var test_device_pipes = webix.protoUI({
        name: 'device_panel_pipes',
        _read: function () {
            var pipe = this.$$('list').getSelectedItem();

            UserAction.readPipe(pipe)
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                }.bind(this))
                .fail(error_handler.bind(this));

        },
        _write: function () {
            var pipe = this.$$('list').getSelectedItem();

            var input;
            try {
                input = JSON.parse(this.elements.input.getValue())
            } catch (e) {
                TangoWebappHelpers.error(e);
            }

            UserAction.writePipe(pipe, input)
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                }.bind(this))
                .fail(error_handler.bind(this));
        },
        _ui: function () {
            return {
                elements: [
                    filter,
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        template: "#display_name#"
                    },
                    {
                        view: 'text',
                        type: 'hidden',
                        height: 2,
                        name: 'name',
                        validate: webix.rules.isNotEmpty,
                        invalidMessage: 'Pipe must be selected from the list'
                    },
                    {
                        view: 'textarea',
                        name: 'input'
                        //TODO code highlight
                    },
                    {
                        cols: [
                            {
                                view: 'button',
                                name: 'btnRead',
                                value: 'Read',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._read();
                                    }
                                }
                            },
                            {
                                view: 'button',
                                name: 'btnWrite',
                                value: 'Write',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._write();
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        },
        $init: function (config) {
            webix.extend(config, this._ui());
            this.$ready.push(function () {
                this.bind(this.$$('list'))
            }.bind(this));
        }
    }, synchronizer, webix.ProgressBar, webix.IdSpace, webix.ui.form);

    /**
     *
     * @type {webix.ui.config}
     */
    var device_panel_header = {
        type: 'clean',
        id: 'device',
        height: 30,
        //TODO align center
        complexData: true,
        template: '[<span class="webix_strong">#display_name#@#host.id#</span>] exported = #info.exported#',
        on: {
            onBindApply: function () {
                var top = this.getTopParentView();
                var device = this.data;
                if (!device.id || device.id == 'unknown' || !device.info.exported) {
                    top.disable();
                    return;
                }

                top.$$('commands').synchronize(device);
                //TODO rename MVC.Class.attributes to anything
                top.$$('attrs').synchronize(device);
                top.$$('attrs').$$('info').clearAll();
                top.$$('pipes').synchronize(device);
                top.enable();
            }
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var device_control_panel = webix.protoUI({
        name: 'device_control_panel',
        clearAll: function () {
            //TODO
            this.$$('commands').clearAll();
            this.$$('attrs').clearAll();
            this.$$('pipes').clearAll();
        },
        _ui: function (context) {
            return {
                rows: [
                    device_panel_header,
                    {
                        view: "tabview",
                        gravity: 3,
                        cells: [
                            {
                                header: "Commands",
                                body: {
                                    view: 'device_panel_commands',
                                    id: 'commands',
                                    context: context
                                }
                            },
                            {
                                header: "Attributes",
                                body: {
                                    view: 'device_panel_attributes',
                                    id: 'attrs',
                                    context: context
                                }
                            },
                            {
                                header: "Pipes",
                                body: {
                                    view: 'device_panel_pipes',
                                    id: 'pipes',
                                    context: context
                                }
                            }
                        ]
                    },
                    {view: "resizer"},
                    {
                        view: 'textarea',
                        id: 'output'
                    }
                ]
            };
        },
        $init: function (config) {
            webix.extend(config, this._ui(config.context));

            this.$ready.push(function () {
                this.$$('device').bind(config.context.devices);
            }.bind(this));
        },
        defaults: {
            disabled: true,
            on: {
                "tango_webapp.item_selected subscribe":function(event){
                    var self = event.controller;
                    self.$$(event.data.kind).show(true);
                    var $$list = self.$$(event.data.kind).$$('list');
                    if($$list.getSelectedId() !== event.data.id)
                        $$list.select(event.data.id);
                },
                "platform_api.ui.initialized subscribe": function (event) {
                    TangoWebappHelpers.debug('test_device_panel.platform_context.create subscribe');
                    event.controller.$$('device').bind(event.data.context.devices);
                },
                "platform_context.destroy subscribe": function (event) {
                    TangoWebappHelpers.debug('test_device_panel.platform_context.destroy subscribe');
                    event.controller.$$('device').unbind();
                }
            }
        }
    }, TangoWebappPlatform.mixin.OpenAjaxListener, webix.IdSpace, webix.ui.layout);


    TangoWebapp.ui.newDeviceControlPanel = function (context) {
        return {
            header: "<span class='webix_icon fa-keyboard-o'></span> Device Control Panel",
            width: 300,
            collapsed: true,
            body: {
                context: context,
                view: 'device_control_panel',
                id: 'device_control_panel'
            }
        };
    }
})();