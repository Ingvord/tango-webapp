import {WaltzWidget} from "@waltz-controls/middleware";
import "views/scripting_console";
import {kControllerUserContext, kUserContext} from "controllers/user_context";
import {kChannelLog, kTopicLog} from "../controllers/log";
import UserScript from "../models/user_script";

export const kWidgetScripting = 'widget:scripting';
const kOverwrite = true;

export default class ScriptingWidget extends WaltzWidget {
    constructor() {
        super(kWidgetScripting);

    }

    config(){
        const proxy = {
            $proxy: true,
            load: (view, params) => {
                return this.app.getContext(kUserContext)
                    .then(userContext => userContext.getOrDefault(this.name, []).map(script => new UserScript({...script})));
            },
            save: (master, params, dataProcessor) =>{
                let promiseContext = this.app.getContext(kUserContext);
                switch(params.operation){
                    case "insert":
                        promiseContext = promiseContext
                            .then(userContext => userContext.ext[this.name].push(params.data))
                        break;
                    case "update":
                        promiseContext = promiseContext
                            .then(userContext => {
                                webix.extend(
                                    userContext.get(this.name).find(script => script.id === params.id),
                                    params.data,
                                    kOverwrite);
                            });
                        break;
                    case "delete":
                        promiseContext = promiseContext
                            .then(userContext => {
                                const indexOf = userContext.get(this.name).findIndex(script => script.id === params.id)
                                userContext.get(this.name).splice(indexOf, 1);
                            });
                        break;
                }

                return promiseContext
                    .then(() => this.app.getController(kControllerUserContext).save())
                    .then(() => this.dispatch(`Successfully ${params.operation}ed UserScript[${params.id}]`,kTopicLog, kChannelLog));
            }
        };

        this.data = new webix.DataCollection({
            url: proxy,
            save: proxy
        });
    }

    ui(){
        return {
            header: "<span class='webix_icon wxi-pencil'></span> Scripting",
            close: true,
            body:
                {
                    id: this.name,
                    view: "scripting_console",
                    root:this
                }
        }
    }

    run(){

    }

    /**
     *
     * @param {UserScript} script
     */
    saveScript(script){
        if (this.data.exists(script.id))
            this.data.updateItem(script.id, script);
        else
            this.data.add(script);

        this.dispatch(`Saving UserScript[${script.name}]`,kTopicLog, kChannelLog);

        return script;
    }

    /**
     *
     * @param {string} id
     */
    removeScript(id){
        this.data.remove(id);

        this.dispatch(`Removing UserScript[${id}]`,kTopicLog, kChannelLog);
    }

    /**
     *
     * @param {UserScript} script
     * @return {Promise<*>}
     */
    executeScript(script){
        return script.func(this.app.context)
            .then(result => {
                script.setResult(result);
                return script;
            })
            .catch(err => {
                script.errors.push(err);
                throw script;
            });
    }

}