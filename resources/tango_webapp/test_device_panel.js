/** @module TestDevicePanel */
(function () {
    /**
     * @type {webix.ui.config}
     */
    var synchronizer = {
        _what: null,
        _command: null,
        synchronize: function (device) {
            TangoWebappHelpers.debug("device[" + device.id + "]." + this._what + ".count=" + device[this._what].count());
            if (!device[this._what].count()) {
                this.showProgress({
                    type: "icon"
                });
                device[this._command]().then(function () {
                    this.hideProgress();
                }.bind(this))
            }
            this.$$('list').data.sync(device[this._what]);
            this.elements.name.setValue('');//drop currently selected item
        },
        $init: function (config) {
            this._what = config.id;
            this._command = 'fetch' + MVC.String.classize(this._what);
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var test_device_commands = webix.protoUI({
        name: 'device_panel_commands',
        _execute_command: function () {
            var command = this.$$('list').getSelectedItem();
            var argin = this.elements.argin.getValue();
            command.execute(argin)
                .then(function (resp) {
                    if (!resp.output) resp.output = "";
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_command_out.ejs'}).render(resp));
                }.bind(this))
                .fail(TangoWebappHelpers.error);
        },
        _ui: function () {
            return {
                elements: [
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        template: "#name#"
                    },
                    {
                        view: 'text',
                        type: 'hidden',
                        height: 2,
                        name: 'name',
                        validate: webix.rules.isNotEmpty,
                        invalidMessage: 'Command must be selected from the list'
                    },
                    {
                        view: 'text',
                        name: 'argin',
                        placeholder: 'Input argument for the command e.g. 3.14 or [3.14, 2.87] etc'
                        //TODO argin converter
                    },
                    {
                        cols: [
                            {
                                view: 'text',
                                name: 'info.in_type',
                                label: 'Argin: ',
                                labelWidth: 50,
                                tooltip: '' //set when onBindRequest
                            },
                            {
                                view: 'text',
                                name: 'info.out_type',
                                label: 'Argout:',
                                labelWidth: 50,
                                tooltip: '' //set when onBindRequest
                            }
                        ]
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
                this.bind(this.$$('list'))
            }.bind(this));
        },
        defaults: {
            complexData: true,
            on: {
                onBindApply: function () {
                    var command = this.$$('list').getSelectedItem();
                    if (!command) return;

                    this.clearValidation();

                    this.elements['info.in_type'].define('tooltip', command.info.in_type_desc);
                    this.elements['info.out_type'].define('tooltip', command.info.out_type_desc);

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

    //TODO make instance functions
    var openTab = function (view, resp) {
        var $$tab = $$(this.id);
        if (!$$tab) {
            $$("main-tabview").addView(view);
            $$tab = $$(this.id);
        }

        $$tab.show();
        $$tab.update(resp.value);
    };

    var openSpectrumWindow = function (resp) {
        openTab.bind(this)({
            header: "<span class='webix_icon fa-area-chart'></span>[<span class='webix_strong'>" + this.device_id + '/' + this.name + "</span>]",
            close: true,
            body: TangoWebapp.ui.newSpectrumView(webix.extend({id: this.id}, resp))
        }, resp);
    };

    var openImageWindow = function (resp) {
        openTab.bind(this)({
            header: "<span class='webix_icon fa-image'></span>[<span class='webix_strong'>" + this.device_id + '/' + this.name + "</span>]",
            close: true,
            body: TangoWebapp.ui.newImageView(webix.extend({id: this.id}, resp))
        }, resp);
    };

    /**
     * @type {webix.protoUI}
     */
    var test_device_attributes = webix.protoUI({
        name: 'device_panel_attributes',
        _read: function () {
            var attribute = this.$$('list').getSelectedItem();

            attribute.read()
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_attribute_out.ejs'}).render(resp))
                }.bind(this))
                .fail(TangoWebappHelpers.error);
        },
        _write: function () {
            var attribute = this.$$('list').getSelectedItem();

            var v = this.elements.w_value.getValue();

            attribute.write(v)
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_attribute_out.ejs'}).render(resp))
                }.bind(this))
                .fail(TangoWebappHelpers.error);
        },
        _plot: function () {
            var attribute = this.$$('list').getSelectedItem();

            if (attribute.info.data_format === "SPECTRUM") {
                attribute.read()
                    .then(openSpectrumWindow.bind(attribute))
                    .fail(TangoWebappHelpers.error);
            } else if (attribute.info.data_format === "IMAGE") {
                attribute.read()
                    .then(openImageWindow.bind(attribute))
                    .fail(TangoWebappHelpers.error);
            } else {
                TangoWebappHelpers.error("Unsupported data format: " + attribute.info.data_format);
            }
        },
        _ui: function () {
            return {
                elements: [
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        template: "#name#"
                    },
                    {
                        view: 'text',
                        type: 'hidden',
                        height: 2,
                        name: 'name',
                        validate: webix.rules.isNotEmpty,
                        invalidMessage: 'Attribute must be selected from the list'
                    },
                    {
                        view: 'text',
                        name: 'w_value'
                    },
                    {
                        view: "textarea",
                        name: "info"
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
                                disabled: true,
                                value: 'Write',
                                click: function () {
                                    var form = this.getFormView();
                                    if (form.validate()) {
                                        form._write();
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
                            }]
                    }
                ]
            }
        },
        $init: function (config) {
            webix.extend(config, this._ui());

            this.$ready.push(function () {
                this.bind(this.$$('list'))
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
                    this.elements.info.setValue(info);
                    if (obj.info.writable.includes("WRITE"))
                        this.elements['btnWrite'].enable();
                    else
                        this.elements['btnWrite'].disable();
                    if (obj.info.data_format === 'SPECTRUM' || obj.info.data_format === 'IMAGE') {
                        this.elements['btnPlot'].enable();
                    } else {
                        this.elements['btnPlot'].disable();
                    }
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

            pipe.read()
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                }.bind(this))
                .fail(TangoWebappHelpers.error)
        },
        _write: function () {
            var pipe = this.$$('list').getSelectedItem();

            var input;
            try {
                input = JSON.parse(this.elements.input.getValue())
            } catch (e) {
                TangoWebappHelpers.error(e);
            }

            pipe.write(input)
                .then(function (resp) {
                    this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                }.bind(this))
                .fail(TangoWebappHelpers.error)
        },
        _ui: function () {
            return {
                elements: [
                    {
                        view: 'list',
                        id: 'list',
                        select: true,
                        template: "#name#"
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
        template: '[<span class="webix_strong">#name#@#host.id#</span>] exported = #info.exported#',
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
                top.$$('pipes').synchronize(device);
                top.enable();
            }
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var test_device_panel = webix.protoUI({
        name: 'test_device_panel',
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
                "platform_context.create subscribe": function (event) {
                    event.controller.$$('device').bind(event.data.devices);
                },
                "platform_context.destroy subscribe": function (event) {
                    event.controller.$$('device').unbind();
                }
            }
        }
    }, TangoWebapp.mixin.OpenAjaxListener, webix.IdSpace, webix.ui.layout)
})();