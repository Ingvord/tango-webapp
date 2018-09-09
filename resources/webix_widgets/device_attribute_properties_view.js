/** @module DeviceAttrPropView
 *  @memberof ui
 */
(function () {
    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.layout.html webix.ui.layout}
     * @property {String} name
     * @memberof ui.DeviceAttrPropView
     */
    var device_attr_prop_view = webix.protoUI(
    /** @lends  device_attr_prop_view */
    {
    name: "Device Attr Props"
}, webix.IdSpace, TangoWebappPlatform.mixin.TabActivator, webix.ui.layout);

    /**
     * @memberof ui.DeviceAttrPropView
     */
TangoWebapp.ui.newDeviceAttrProps = function () {
    return {
        view: "Device Attr Props",
        id  : "device_attr_properties",
        rows: [
            {
                view : "tabview",
                cells: [
                    //TODO dynamically add tabs when loaded?
                    {
                        header: "Prop1",
                        body  : {
                            id     : "name",
                            view   : "datatable",
                            columns: [
                                {header: "Property name"},
                                {header: "Value"}
                            ]

                        }
                    }
                ]
            },

            {
                view: "toolbar",
                cols: [
                    {view: "button", id: "btnRefresh", value: "Refresh", width: 100, align: "left"},
                    {view: "button", id: "btnApply", value: "Apply", width: 100, align: "left"}]
            }

        ]
    }
};
})();