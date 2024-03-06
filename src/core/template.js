define(function(require, exports, module) {
    var kity = require('./kity');
    var utils = require('./utils');
    var Minder = require('./minder');
    var Command = require('./command');
    var MinderNode = require('./node');
    var Module = require('./module');

    var _templates = {};

    function register(name, supports) {
        _templates[name] = supports;
    }
    exports.register = register;

    utils.extend(Minder, {
        getTemplateList: function() {
            return _templates;
        }
    });
    var DEFAULT_TEMPLATE = 'right';
    var TEMP_TEMPLATE = '';
    kity.extendClass(Minder, (function() {
        var originGetTheme = Minder.prototype.getTheme;
        return {

            isSupportTemplate: function(name) {
                return !!_templates[name];
            },

            useTemplate: function(name, duration) {
                this.setTemplate(name, 2222);
                this.refresh(duration || 800);
            },

            getTemplate: function(from) {
                if (from === 'exportData' && TEMP_TEMPLATE) {
                    return TEMP_TEMPLATE;
                }
                return this._template || 'default';
            },

            setTemplate: function(name, fff) {
                if(!this.isSupportTemplate(name)) {
                    TEMP_TEMPLATE = name;
                    name = DEFAULT_TEMPLATE;
                    return this._template = name || null;
                };
                TEMP_TEMPLATE = '';
                this._template = name || null;
            },

            getTemplateSupport: function(method) {
                var supports = _templates[this.getTemplate()];
                return supports && supports[method];
            },

            getTheme: function(node, from) {
                console.log('ggggggetslkjsadf');
                var support = this.getTemplateSupport('getTheme') || originGetTheme;
                return support.call(this, node, from);
            }
        };
    })());


    kity.extendClass(MinderNode, (function() {
        var originGetLayout = MinderNode.prototype.getLayout;
        var originGetConnect = MinderNode.prototype.getConnect;
        return {
            getLayout: function() {
                var support = this.getMinder().getTemplateSupport('getLayout') || originGetLayout;
                return support.call(this, this);
            },

            getConnect: function() {
                var support = this.getMinder().getTemplateSupport('getConnect') || originGetConnect;
                return support.call(this, this);
            }
        };
    })());

    Module.register('TemplateModule', {
        /**
         * @command Template
         * @description 设置当前脑图的模板
         * @param {string} name 模板名称
         *    允许使用的模板可以使用 `kityminder.Minder.getTemplateList()` 查询
         * @state
         *   0: 始终可用
         * @return 返回当前的模板名称
         */
        commands: {
            'template': kity.createClass('TemplateCommand', {
                base: Command,

                execute: function(minder, name) {
                    minder.useTemplate(name);
                    minder.execCommand('camera');
                },

                queryValue: function(minder) {
                    return minder.getTemplate() || 'default';
                }
            })
        }
    });
});