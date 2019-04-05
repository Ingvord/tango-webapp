/**
 * @module svg
 */
(function(){
    //this function is private to this module
    var newSVG=function(){
        return {
            id:'mydashboard.plot',
            gravity: 3,
            template: function () {
                let html = "<object data='../../images/SVG.svg' type='image/svg+xml' id='alphasvg'></object>";
                return html;
            }
        }
    };

    /**
     * @type {webix.protoUI}
     */
    var svg = webix.protoUI(
        {
            name: 'svg',
            /**
             * @return {webix.ui}
             * @private
             */
            _ui:function(){
                return {
                    rows:[
                                //call of the functuon. It is a good idea to move parts of the UI to a dedicated functions
                                newSVG()
                    ]
                }
            },
            /**
             *
             * @param config
             * @constructor
             */
            $init:function(config){
                //extend client config with this widget's ui
                webix.extend(config, this._ui());
                //add some after construction logic
                this.$ready.push(function(){
                    debugger
                    if(document.getElementById("alphasvg") == null) {return;}
                    alert("document.getElementById('blue') ="+document.getElementById('blue'));
                    alert("blue="+document.getElementById("alphasvg").contentDocument.getElementById("blue"));

                    var blue = document.getElementById("alphasvg").contentDocument.getElementById("blue");

                    //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    // var svgDoc = document.getElementById("alphasvg").contentDocument;
                    // alert("svgDoc ="+svgDoc);
                    // var blue = svgDoc.getElementById("blue");
                    blue.addEventListener("mousedown",function(){
                        alert('hello world!')
                    }, false);


                    webix.message("SVG has been initialized!")
                }.bind(this));//very important to bind function to a proper this object
            },
            defaults:{
                on: {

                    'platform_api.ui.initialized subscribe': function (data) {
                    debugger
                        if(document.getElementById("alphasvg") == null) {return;}

                        document.getElementById("alphasvg").addEventListener("load", () => {
                            console.log("svg loaded")
                             debugger
                            var blue = document.getElementById("alphasvg").contentDocument.getElementById("blue");

                            //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                            // var svgDoc = document.getElementById("alphasvg").contentDocument;
                            // alert("svgDoc ="+svgDoc);
                            // var blue = svgDoc.getElementById("blue");
                            blue.addEventListener("mousedown",function(){
                                alert('hello world!')
                            }, false);
                        });
                    }},
            }
        }
        // webix.IdSpace is required to isolate ids within this component
        , TangoWebappPlatform.mixin.OpenAjaxListener, webix.IdSpace, webix.ui.layout);//this component extends webix layout -- an empty view

    //this function will be available globally i.e. exports our dashboard
    TangoWebapp.ui.newSVGboard = function(config){
        return webix.extend({
            view: 'svg'
        }, config);
    }
})();





