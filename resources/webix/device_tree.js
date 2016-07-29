webix.protoUI({
    updateRoot:function(rootValue){
        this.clearAll();
        this.add({id: 'root', value: rootValue, open:false, data:[]});
        this.loadBranch('root', null, null);
        this.refresh();
    },
    name: "DeviceTree",
    _ctxMenu:webix.ui({
        view: "contextmenu",
        autoheight: true,
        on: {
            onItemClick: function (id) {
                var item = this.getContext().obj.getItem(this.getContext().id);
                switch(id){
                    case "Test device":
                        TangoWebapp.helpers.openDevicePanel(TangoWebapp.helpers.getDevice());
                        break;
                    case "Change root...":
                        TangoWebapp.helpers.changeTangoHost();
                        break;
                    case "Delete":
                        TangoWebapp.helpers.deleteDevice(TangoWebapp.helpers.getDevice()).then(function(){
                            this.getContext().obj.remove(this.getContext().id);
                        }.bind(this));
                        break;
                    default:
                        debugger;
                }
            }
        }
        }),
    _ctxMember: [
            //"Copy",
            //"Paste",
            "Delete",
            {$template: "Separator"},
            "Monitor device",
            "Test device",
            //"Define device alias",
            "Restart device",
            //{$template: "Separator"},
            //"Go to Server node",
            //"Go to Admin device node",
            {$template: "Separator"},
            "Log viewer"
        ],
    defaults: {
        //activeTitle:true,
        type: 'lineTree',
        select:true,
        on: {
            onItemDblClick:function(id, e, node){
                webix.message("DblClick " + id);
                var item = this.getItem(id);
                if(item.$level == 4) {//member
                    if(!$$("atk" + id)) {
                        $$("mainTabview").addView(
                            {
                                header: "ATKPanel [" + item._name + "]",
                                close: true,
                                body: {
                                    view: "ATKPanel",
                                    id: "atk" + id
                                }
                            }
                        );
                    }
                    $$("atk" + id).show();
                }

            },
            onItemClick: function (id, e, node) {
                var item = this.getItem(id);
                if (item.$level == 4 || item.$level == 5) { //device, Properties, Event etc
                    TangoWebapp.devices.setCursor(item._device_id);
                    var devId = "dev" + item._device_id;
                    if (!$$(devId)) {
                        $$("main-tabview").addView(
                            TangoWebapp.newDeviceView(
                                {
                                    device: TangoWebapp.helpers.getDevice(),
                                    id    : devId
                                })
                        );
                    }
                    $$(devId).show();

                    $$(devId).$$(item._view_id).activate();
                }
            },
            onDataRequest: function (id, cbk, url) {
                var item = this.getItem(id);
                if (item) webix.message("Getting children of " + item.value);
                var promise;
                if (id === 'root')//domain
                    promise = TangoWebapp.db.DbGetDeviceDomainList("*");
                else if (item.$level == 2)//family
                    promise = TangoWebapp.db.DbGetDeviceFamilyList(item.value + '/*');
                else if (item.$level == 3)//member
                    promise = TangoWebapp.db.DbGetDeviceMemberList(this.getItem(item.$parent).value + '/' + item.value + '/*');
                else {
                    return false;//ignore member
                }
                if (item) {
                    webix.message("Getting children of " + item.value);


                }
                this.parse(promise.then(this.handleResponse(id, item)));


                return false;//cancel default behaviour
            },
            onBeforeContextMenu: function (id, e, node) {
                var item = this.getItem(id);
                if (id === 'root'){
                    this._ctxMenu.clearAll();
                    this._ctxMenu.parse(["Change root..."]);
                    return true;
                }  else if (item.$level == 4) {//member
                    TangoWebapp.devices.setCursor(item._device_id);
                    this._ctxMenu.clearAll();
                    this._ctxMenu.parse(this._ctxMember);
                    return true;
                } else {
                    return false;
                }
            }
        }
    },
    $init: function () {
        this._ctxMenu.attachTo(this);

        this.$ready.push(function(){
            this.updateRoot(TangoWebapp.consts.REST_API_URL);
        }.bind(this));

    },
    handleResponse: function (parent_id, item) {
        var self = this;
        return function (response) {
            return {
                parent: parent_id,
                data: response.output.map(
                    function (el) {
                        if (item && item.$level == 3) {
                            var name = self.getItem(item.$parent).value + "/" + item.value + "/" + el;
                            var device;
                            if(!(device = Device.find_one(name))) //TODO when changing tango host this may lead to falsy device, i.e. device from previous db
                                device = new Device(name);
                            var dev_id = TangoWebapp.devices.add(device);
                            return {
                                _view_id:'device_info',
                                _device_id: dev_id,
                                value: el,
                                data: [
                                    {
                                        value: 'Properties',
                                        _device_id: dev_id,
                                        _view_id: 'device_properties'
                                    },
                                    {
                                        value: 'Polling',
                                        _device_id: dev_id,
                                        _view_id: 'device_polling'
                                    },
                                    {
                                        value: 'Event',
                                        _device_id: dev_id,
                                        _view_id: 'device_events'
                                    },
                                    {
                                        value: 'Attribute config',
                                        _device_id: dev_id,
                                        _view_id: 'device_attr_config'
                                    },
                                    {
                                        value: 'Pipe config',
                                        _device_id: dev_id,
                                        _view_id: 'device_pipe_config'
                                    },
                                    {
                                        value: 'Attribute properties',
                                        _device_id: dev_id,
                                        webix_kids: true,
                                        _view_id: 'device_attr_properties'
                                    },
                                    {
                                        value: 'Logging',
                                        _device_id: dev_id,
                                        _view_id: 'device_logging'
                                    }
                                ]
                            };
                        } else {
                            return {value: el, webix_kids: true};
                        }
                    })
            }
        };
    },
    //url:TangoWebapp.rest_api_url + '/devices',
    onContext: {}
}, webix.IdSpace, webix.EventSystem, webix.ui.tree);


TangoWebapp.ui.newDeviceTree = function(){
    return {
        view: "DeviceTree",
        id: "device_tree"
    }
};