import "../stylesheets/loader.css";
import "../stylesheets/waltz.css";
// import "../models/platform/subscriptions.js";
// import "../models/tango_webapp/user_action.js";
// import "../resources/webix_widgets/import.js";
import {Application} from "@waltz-controls/middleware";
import LoginWidget from "widgets/login";
import MainWindow from "widgets/main_window";
import AjaxLoader from "controllers/ajax_loader";
import LoginController from "controllers/login";
import TangoTree from "widgets/tango/tree";
import TangoRestController from "controllers/tango_rest";
import ApplicationLogController from "controllers/log";
import WebixMessageController from "controllers/message";
import TangoDeviceWidget from "widgets/tango/device";
import UserContextController from "controllers/user_context";
import UserActionController from "controllers/user_action_controller";

// TangoWebappPlatform.consts.LOG_DATE_FORMATTER = webix.Date.dateToStr("%c");

const waltz = new Application({name: APPNAME, version: VERSION})
    .registerErrorHandler(err => console.error(err))
    .registerController(new AjaxLoader())
    .registerController(new LoginController())
    .registerController(new TangoRestController())
    .registerController(new ApplicationLogController())
    .registerController(new WebixMessageController())
    .registerController(new UserContextController())
    .registerController(new UserActionController())
    .registerWidget(new MainWindow())
    .registerWidget(new TangoTree())
    .registerWidget(new TangoDeviceWidget())


export const kWaltz = 'app:waltz';

new Application({name: 'WaltzLogin', version: VERSION})
    .registerErrorHandler(err => console.error(err))
    .registerContext(kWaltz, waltz)
    .registerWidget(new LoginWidget())
    .run();


// new LoginController()
//     .run()
//     .then(user => {
//         //TODO migrate to fetch
//         webix.attachEvent("onBeforeAjax", function (mode, url, params, x, headers) {
//             x.withCredentials = true;
//             Object.assign(headers, user.headers);
//         });
//
//         //In fact requests UserContext from /user-context/cache
//         return TangoWebappPlatform.UserContext.find_one(user.name);
//     })
//     .then(userContext => {
//         TangoWebappHelpers.debug(userContext.toString());
//
//         const rest = new TangoWebappPlatform.TangoRestApi({url: userContext.rest_url});
//         const eventbus = new EventBus();
//
//         TangoWebappPlatform.PlatformContext.create({
//             UserContext: userContext,
//             rest,
//             eventbus
//         });
//
//         TangoWebappHelpers.debug("platform/main done.");
//     });