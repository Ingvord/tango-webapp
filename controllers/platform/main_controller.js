/**
 * Main controller
 *
 * @type {TangoWebappPlatform.MainController}
 */
TangoWebappPlatform.MainController = MVC.Controller.extend('main', {
}, {
    /**
     * This is the main entry point of the application. This function is invoked after jmvc has been completely initialized.
     *
     * @param {Object} params
     */
    load: function (params) {
        //override date formatter
        TangoWebappPlatform.consts.LOG_DATE_FORMATTER = webix.Date.dateToStr("%c");
        
        //draw ui
        webix.ui({
            view: 'layout',
            id: 'main',
            type: 'space',
            rows: [
                TangoWebappPlatform.TopToolbarController.getUI(),
                {
                    id: "content"
                },
                TangoWebappPlatform.BottomToolbar.getUI()
            ]
        });
        webix.ui.fullScreen();

        var user_ctx = this.load_user_context();

        TangoWebappHelpers.debug(user_ctx.toString());

        var rest = new TangoWebappPlatform.TangoRestApi({url: user_ctx.rest_url});

        TangoWebappPlatform.PlatformContext.create({
            UserContext: user_ctx,
            rest: rest
        });

        TangoWebappHelpers.debug("platform/main done.");
    },
    /**
     *
     * @return {UserContext}
     */
    load_user_context:function(){
        var authorization = webix.storage.session.get("Authorization");
        if (authorization !== null && authorization.indexOf('Basic ') === 0) {
            webix.attachEvent("onBeforeAjax", function (mode, url, params, x, headers) {
                x.withCredentials = true;
                headers["Authorization"] = webix.storage.session.get("Authorization");
            });
            var username = atob(authorization.substring(6)).split(':')[0];

            return TangoWebappPlatform.UserContext.find_one(username);
        } else {
            TangoWebappHelpers.log("No Authorization found, fallback to test user context");
            webix.attachEvent("onBeforeAjax", function (mode, url, params, x, headers) {
                x.withCredentials = true;
                headers["Authorization"] = "Basic " + btoa("tango-cs:tango");
            });
            TangoWebappPlatform.UserContext.set_store_type(TangoWebappPlatform.DummyStore);
            return TangoWebappPlatform.UserContext.find_one("tango-cs");
        }
    },
    _dispatch:function(what, platform_api){
        MVC.Controller.controllers.main
            .filter(function(ctrl) { return what in ctrl.prototype})
            .forEach(function(ctrl) {
                ctrl.dispatch(what, platform_api)
            }
                );
    },
    "platform_context.create subscribe": function(event){
        var platform_api = new TangoWebappPlatform.PlatformApi({
            context: event.data,
            ui_builder: {}
        });

        this._dispatch("buildUI", platform_api);
        platform_api.ui_builder.build();
        PlatformApi = platform_api;
        this._dispatch("initialize", platform_api);
    },
    "platform_context.set_rest subscribe": function (event) {
        var rest = event.data.rest;

        rest.isAlive()
            .then(function (rest) {
                TangoWebappHelpers.log("TangoWebapp has been loaded!");
            })
            .fail(function (rest) {
                webix.ui(TangoWebapp.ui.newCriticalErrorWindow(rest)).show();
            })
    },
    /**
     * Refreshes device in the context
     *
     * @param event
     */
    "tango_webapp.device_loaded subscribe": function (event) {
        if (PlatformContext.devices.exists(event.data.id)) {
            PlatformContext.devices.updateItem(event.data.id, event.data);
        } else {
            PlatformContext.devices.add(event.data);
        }
    },
    "tango_webapp.tango_host_loaded subscribe": function (event) {
        if (PlatformContext.tango_hosts.exists(event.data.id)) {
            PlatformContext.tango_hosts.updateItem(event.data.id, event.data);
        } else {
            PlatformContext.tango_hosts.add(event.data);
        }
    },
    "user_context_controller.delete_tango_host subscribe": function (event) {
        PlatformContext.tango_hosts.remove(event.data);
    }
});