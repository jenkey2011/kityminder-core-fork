define(function(require, exports, module) {
    var kity = require('../core/kity');
    var utils = require('../core/utils');
    var keymap = require('../core/keymap');
    var MinderNode = require('../core/node');
    var Command = require('../core/command');
    var Module = require('../core/module');
    var Renderer = require('../core/render');

    Module.register('Expand', function() {
        var minder = this;
        var EXPAND_STATE_DATA = 'expandState',
            STATE_EXPAND = 'expand',
            STATE_COLLAPSE = 'collapse';

        // 将展开的操作和状态读取接口拓展到 MinderNode 上
        kity.extendClass(MinderNode, {

            /**
             * 展开节点
             * @param  {Policy} policy 展开的策略，默认为 KEEP_STATE
             */
            expand: function() {
                this.setData(EXPAND_STATE_DATA, STATE_EXPAND);
                return this;
            },

            /**
             * 收起节点
             */
            collapse: function() {
                this.setData(EXPAND_STATE_DATA, STATE_COLLAPSE);
                return this;
            },

            /**
             * 判断节点当前的状态是否为展开
             */
            isExpanded: function() {
                var expanded = this.getData(EXPAND_STATE_DATA) !== STATE_COLLAPSE;
                return expanded && (this.isRoot() || this.parent.isExpanded());
            },

            /**
             * 判断节点当前的状态是否为收起
             */
            isCollapsed: function() {
                return !this.isExpanded();
            }
        });

        /**
         * @command Expand
         * @description 展开当前选中的节点，保证其可见
         * @param {bool} justParents 是否只展开到父亲
         *     * `false` - （默认）保证选中的节点以及其子树可见
         *     * `true` - 只保证选中的节点可见，不展开其子树
         * @state
         *   0: 当前有选中的节点
         *  -1: 当前没有选中的节点
         */
        var ExpandCommand = kity.createClass('ExpandCommand', {
            base: Command,

            execute: function(km, justParents) {
                var node = km.getSelectedNode();
                if (!node) return;
                if (justParents) {
                    node = node.parent;
                }
                while (node.parent) {
                    node.expand();
                    node = node.parent;
                }
                node.renderTree();
                km.layout(100);
            },

            queryState: function(km) {
                var node = km.getSelectedNode();
                return node && !node.isRoot() && !node.isExpanded() ? 0 : -1;
            }
        });


        /**
         * @command ExpandAll
         * @description 展开当前选中的节点以及其子树
         * @param {boolean} 是否从根节点开始展开，默认是 false
         */
        var ExpandAllCommand = kity.createClass('ExpandAllCommand', {
            base: Command,
            execute: function(km, fromRoot) {
                var node = !!fromRoot ? km.getRoot() : km.getSelectedNode();
                if (!node) return;
                node.traverse(function(nodeItem) {
                    nodeItem.expand();
                });
                node.renderTree();
                km.layout(100);
            },
        });

        /**
         * @command ExpandToLevel
         * @description 展开脑图到指定的层级
         * @param {number} level 指定展开到的层级，最少值为 1。
         * @state
         *   0: 一直可用
         */
        var ExpandToLevelCommand = kity.createClass('ExpandToLevelCommand', {
            base: Command,
            execute: function(km, level) {
                km.getRoot().traverse(function(node) {
                    if (node.getLevel() < level) node.expand();
                    if (node.getLevel() == level && !node.isLeaf()) node.collapse();
                });
                km.refresh(100);
            },
            enableReadOnly: true
        });

        /**
         * @command Collapse
         * @description 收起当前节点的子树
         * @state
         *   0: 当前有选中的节点
         *  -1: 当前没有选中的节点
         */
        var CollapseCommand = kity.createClass('CollapseCommand', {
            base: Command,

            execute: function(km) {
                var node = km.getSelectedNode();
                if (!node) return;

                node.collapse();
                node.renderTree();
                km.layout();
            },

            queryState: function(km) {
                var node = km.getSelectedNode();
                return node && !node.isRoot() && node.isExpanded() ? 0 : -1;
            }
        });

        var Expander = kity.createClass('Expander', {
            base: kity.Group,

            constructor: function(node) {
                this.callBase();
                this.radius = 6;
                this.outline = new kity.Circle(this.radius).stroke('#2E76F6').fill('white');
                this.sign = new kity.Path().stroke('#2E76F6');
                this.lenNumber = new kity.Text(node.parent.children.length)
                .setX(-this.radius/2)
                .setY(0)
                .setSize(10)
                .setVerticalAlign('middle')
                .fill('#2E76F6');
                this.addShapes([this.outline, this.sign, this.lenNumber]);
                this.initEvent(node);
                this.setId(utils.uuid('node_expander'));
                this.setStyle('cursor', 'pointer');
            },

            initEvent: function(node) {
                this.on('mousedown', function(e) {
                    minder.select([node], true);
                    if (node.isExpanded()) {
                        node.collapse();
                    } else {
                        node.expand();
                    }
                    node.renderTree().getMinder().layout(100);
                    node.getMinder().fire('contentchange');
                    e.stopPropagation();
                    e.preventDefault();
                });
                this.on('dblclick click mouseup', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                });
            },

            setState: function(state, length, node) {
                if (state == 'hide') {
                    this.setVisible(false);
                    return;
                }
                this.setVisible(true);
                this.sign.setRotate(0)
                // var pathData = ['M', 1.5 - this.radius, 0, 'L', this.radius - 1.5, 0];
                var ax = (0.7 / 3) * this.radius;
                var ay = (3.2 / 5) * this.radius;
                var bx = (1 / 3) * this.radius;
                var by = 0 * this.radius;
                pathData = ['M', ax, -ay, 'L', -bx, by, 'L', ax, ay];
                this.lenNumber.setOpacity(0)
                if (state == STATE_COLLAPSE) {
                    this.addClass('collapse');
                    node.rc.addClass('collapse');
                    pathData = []
                    this.lenNumber.setContent(length);
                    this.lenNumber.setOpacity(1);
                    
                    if (length > 99) {
                        this.lenNumber.setContent('...').setSize(10).setX(-this.radius/2 - 1).setY(-3);
                    }
                    else if (length > 9) {
                        this.lenNumber.setSize(9).setX(-this.radius/2 - 2);
                    }
                    else {
                        this.lenNumber.setSize(10).setX(-this.radius/2);
                    }
                } else {
                    this.removeClass('collapse');
                    node.rc.removeClass('collapse');
                }
                this.sign.setPathData(pathData);
            }
        });

        var ExpanderRenderer = kity.createClass('ExpanderRenderer', {
            base: Renderer,

            create: function(node) {
                if (node.isRoot()) return;
                this.expander = new Expander(node);
                node.getRenderContainer().prependShape(this.expander);
                node.expanderRenderer = this;
                this.node = node;
                return this.expander;
            },

            shouldRender: function(node) {
                return node.getMinder().getOption('enableExpanderUI') !== false && !node.isRoot();
            },

            update: function(expander, node, box) {
                if (!node.parent) return;

                var visible = node.parent.isExpanded();
                var len = utils.countNodes(node) - 1;
                expander.setState(visible && node.children.length ? node.getData(EXPAND_STATE_DATA) : 'hide', len, node);

                var box = node.getContentBox();
                this.expander.setTranslate(box.width + box.x + 10, 0);
            }
        });

        return {
            commands: {
                'expand': ExpandCommand,
                'expandAll': ExpandAllCommand,
                'expandtolevel': ExpandToLevelCommand,
                'collapse': CollapseCommand
            },
            events: {
                'layoutapply': function(e) {
                    var r = e.node.getRenderer('ExpanderRenderer');
                    if (r.getRenderShape()) {
                        r.update(r.getRenderShape(), e.node);
                    }
                },
                'beforerender': function(e) {
                    var node = e.node;
                    var visible = !node.parent || node.parent.isExpanded();
                    var minder = this;

                    node.getRenderContainer().setVisible(visible);
                    if (!visible) e.stopPropagation();
                },
                'normal.keydown': function(e) {
                    if (this.getStatus() == 'textedit') return;
                    if (e.originEvent.keyCode == keymap['/']) {
                        var node = this.getSelectedNode();
                        if (!node || node == this.getRoot()) return;
                        var expanded = node.isExpanded();
                        this.getSelectedNodes().forEach(function(node) {
                            if (expanded) node.collapse();
                            else node.expand();
                            node.renderTree();
                        });
                        this.layout(100);
                        this.fire('contentchange');
                        e.preventDefault();
                        e.stopPropagationImmediately();
                    }
                    if (e.isShortcutKey('Alt+`')) {
                        this.execCommand('expandtolevel', 9999);
                    }
                    for (var i = 1; i < 6; i++) {
                        if (e.isShortcutKey('Alt+' + i)) {
                            this.execCommand('expandtolevel', i);
                        }
                    }
                }
            },
            renderers: {
                outside: ExpanderRenderer
            },
            contextmenu: [{
                command: 'expandtoleaf',
                query: function() {
                    return !minder.getSelectedNode();
                },
                fn: function(minder) {
                    minder.execCommand('expandtolevel', 9999);
                }
            }, {
                command: 'expandtolevel1',
                query: function() {
                    return !minder.getSelectedNode();
                },
                fn: function(minder) {
                    minder.execCommand('expandtolevel', 1);
                }
            }, {
                command: 'expandtolevel2',
                query: function() {
                    return !minder.getSelectedNode();
                },
                fn: function(minder) {
                    minder.execCommand('expandtolevel', 2);
                }
            },{
                command: 'expandtolevel3',
                query: function() {
                    return !minder.getSelectedNode();
                },
                fn: function(minder) {
                    minder.execCommand('expandtolevel', 3);
                }
            }, {
                divider: true
            }]
        };
    });
});
