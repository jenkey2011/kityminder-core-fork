/**
 * @file relation core
 */

define(function(require, exports, module) {
    var kity = require('./kity');
    var utils = require('./utils');
    var Minder = require('./minder');
    var MinderNode = require('./node');

    var defaultLineStyle = {
        'line-width': 1,          // 可选值：任意数字
        'line-color': '#999',       // 可选值：任意颜色
        'line-style': 'sysDot',     // 可选值：soild、sysDash、sysDot、dash、dashDot、dashDotDot
        'from-marker': 'empty',     // 可选值：dot、arrow、empty
        'to-marker': 'arrow',       // 可选值：dot、arrow、empty
    };

    var defaultTextStyle = {
        'color': '#999',            // 可选值：任意颜色
        'font-size': 14,            // 可选值：任意数字
        'font-weight': 'normal',    // 可选值：normal、bold
        'font-family': 'auto',      // 可选值：auto、其他字体名称
        'font-style': 'normal',     // 可选值：normal, italic
        'text-decoration': 'none',  // 可选值：none、underline、line-through
    };

    var numberKeyList = [
        'line-width',
        'font-size',
    ];

    /**
     * @class MinderRelation
     *
     * 关联线
     */
    var minderNode = new MinderNode();
    var MinderRelation = kity.createClass('MinderRelation', {

        /**
         *
         * @param {String|Object} textOrData
         *     节点的初始数据或文本
         */
        constructor: function(textOrData) {
            // 数据
            this.data = {
                id: utils.guid(),
                cid: utils.guid(),
                created: +new Date(),
                text: '',
                from: '',
                to: '',
            };

            this._modifyStatus = {};
            this.editable = false;
            this.initRelation();
            this.type = 'relation';
            this.setDefaultLineStyle();
            this.setDefaultTextStyle();

            if (utils.isString(textOrData)) {
                this.setText(textOrData);
            }
            else if (utils.isObject(textOrData)) {
                utils.extend(this.data, utils.omitEmptyKey(textOrData));
            }
        },

        initRelation: function() {
            this.rc = new kity.Group().setId(utils.uuid('node_relation_group'));
            this.rc.relationNode = this;
        },

        getRelationRenderContainer: function() {
            return this.rc;
        },

        getRenderContainer: function() {
            return this.textGroup;
        },

        getRelationContainer: function() {
            return this.getMinder()._relationContainer;
        },

        getLine:function(){
            return this.line;
        },

        setDefaultTextStyle: function() {
            utils.extend(this.data, defaultTextStyle);
        },

        setDefaultLineStyle: function() {
            utils.extend(this.data, defaultLineStyle);
        },

        getLineStyle: function() {
            var me = this;
            return Object.keys(defaultLineStyle).reduce(function(obj, key) {
                obj[key] = me.data[key];
                return obj;
            }, {});
        },

        getTextStyle: function() {
            var me = this;
            return Object.keys(defaultTextStyle).reduce(function(obj, key) {
                obj[key] = me.data[key];
                return obj;
            }, {});
        },

        getFromNode: function() {
            return this.getMinder().getNodeById(this.data.from);
        },

        getToNode: function() {
            return this.getMinder().getNodeById(this.data.to);
        },

        getMinder: function() {
            return this.minder;
        },

        setMinder: function(minder) {
            this.minder = minder;
        },

        // 设置更新状态
        setModifyStatus: function(status) {
            this._modifyStatus = status;
        },

        enableEdit: function() {
            this.editable = true;
        },

        disableEdit: function() {
            this.editable = false;
        },

        getType: function() {
            return 'relation';
        },

        getText: function() {
            return this.data.text || '联系';
        },

        setText: function(text) {
            return this.data.text = text;
        },

        getData: function(key) {
            return key ? this.data[key] : this.data;
        },

        setData: function(key, value) {
            if (numberKeyList.includes(key)) {
                value = Number(value);
            }

            if (typeof key === 'object') {
                var data = key;
                for (key in data)
                    if (data.hasOwnProperty(key)) {
                        this.setData(key, data[key]);
                    }
            }
            else {
                this.data[key] = value;
            }
            return this;
        },

        getRenderBox: function(rendererType, refer) {
            rendererType = rendererType || 'TextRenderer';
            var renderer = rendererType && minderNode.getRenderer.call(this, rendererType);
            var contentBox = renderer ? renderer.contentBox : this.getContentBox();
            var ctm = kity.Matrix.getCTM(this.getRenderContainer(), refer || 'paper');
            return ctm.transformBox(contentBox);
        },

        getRenderer: function() {
            return null;
        },

        update: function() {
            var minder = this.getMinder();
            var fromNode = minder.getNodeById(this.data.from);
            var toNode = minder.getNodeById(this.data.to);
            var rc = this.getRelationRenderContainer();

            if(!fromNode || !toNode) {
                rc.setVisible(false);
                return;
            };

            if((fromNode.getParent() && fromNode.getParent().isCollapsed()) ||
                (toNode.getParent() && toNode.getParent().isCollapsed())) {
                rc.setVisible(false);
                return;
            }

            this.updateLine();
            this.updateText();
            this.render();

            rc.setVisible(true);
            rc.setStyle('pointer-events', 'initial');
        }
    });

    kity.extendClass(Minder, {

        createRelation: function(data) {
            var relation = new MinderRelation(data);
            relation.setMinder(this);
            relation.create();
            this._relationArray.push(relation);
            this.attachRelation(relation);
            return relation;
        },

        attachRelation: function(relation) {
            var rc = relation.getRelationContainer();
            rc.addShape(relation.getRelationRenderContainer());
            rc.bringTop();
        },

        detachRelation: function(relation) {
            var rc = relation.getRelationContainer();
            rc.removeShape(relation.getRelationRenderContainer());
        },

        removeRelationNode: function(relation) {
            var relations = this.getRelations();
            var index = relations.findIndex(function (item) {
                return item.getData('id') === relation.getData('id');
            });
            relations.splice(index, 1);
            this.detachRelation(relation);
        },

        removeRelationByNode: function(node) {
            var me = this;
            var relation = this.getRelationsByNodeId(node.getData('id'));
            relation.forEach(function (relation) {
                me.detachRelation(relation);
            });
        },

        removeDisableRelation: function() {
            var arr = [];
            var minder = this;
            var relations = this.getRelations();
            relations.forEach(function(relation) {
                if (!relation.getData('from') || !relation.getData('to')) {
                    arr.push(relation);
                }
            });

            if (arr.length > 0) {
                arr.forEach(function(relation) {
                    minder.removeRelationNode(relation);
                });
            }
        },

        getRelationById: function(id) {
            var relations = this.getRelations();
            return relations.find(function (relation) {
                return relation.data.id === id;
            });
        },

        getRelationsByNodeId: function(nodeId) {
            var relations = this.getRelations();
            var result = [];
            relations.forEach(function (relation) {
                if (relation.getData('from') === nodeId || relation.getData('to') === nodeId) {
                    result.push(relation);
                }
            });
            return result;
        },

        getRelations: function() {
            return this._relationArray || [];
        }
    });

    module.exports = MinderRelation;
});