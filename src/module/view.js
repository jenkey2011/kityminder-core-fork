define(function(require, exports, module) {
    var kity = require('../core/kity');
    var utils = require('../core/utils');

    var Minder = require('../core/minder');
    var MinderNode = require('../core/node');
    var Command = require('../core/command');
    var Module = require('../core/module');
    var Renderer = require('../core/render');

    var ViewDragger = kity.createClass('ViewDragger', {
        constructor: function(minder) {
            this._minder = minder;
            this._enabled = false;
            this._bind();
            var me = this;
            this._minder.getViewDragger = function() {
                return me;
            };
            this.setEnabled(false);
        },

        isEnabled: function() {
            return this._enabled;
        },

        setEnabled: function(value) {
            var paper = this._minder.getPaper();
            paper.setStyle('cursor', value ? 'pointer' : 'default');
            paper.setStyle('cursor', value ? '-webkit-grab' : 'default');
            this._enabled = value;
        },
        timeline: function() {
            return this._moveTimeline;
        },

        move: function(offset, duration) {
            var minder = this._minder;

            var targetPosition = this.getMovement().offset(offset);

            this.moveTo(targetPosition, duration);
        },

        moveTo: function(position, duration) {

            if (duration) {
                var dragger = this;

                if (this._moveTimeline) this._moveTimeline.stop();

                this._moveTimeline = this._minder.getRenderContainer().animate(new kity.Animator(
                    this.getMovement(),
                    position,
                    function(target, value) {
                        dragger.moveTo(value);
                    }
                ), duration, 'easeOutCubic').timeline();

                this._moveTimeline.on('finish', function() {
                    dragger._moveTimeline = null;
                });

                return this;
            }

            this._minder.getRenderContainer().setTranslate(position.round());
            this._minder.fire('viewchange');
        },

        getMovement: function() {
            var translate = this._minder.getRenderContainer().transform.translate;
            return translate ? translate[0] : new kity.Point();
        },

        getView: function() {
            var minder = this._minder;
            var c = minder._lastClientSize || {
                width: minder.getRenderTarget().clientWidth,
                height: minder.getRenderTarget().clientHeight
            };
            var m = this.getMovement();
            var box = new kity.Box(0, 0, c.width, c.height);
            var viewMatrix = minder.getPaper().getViewPortMatrix();
            return viewMatrix.inverse().translate(-m.x, -m.y).transformBox(box);
        },

        _bind: function() {
            var dragger = this,
                isTempDrag = false,
                lastPosition = null,
                currentPosition = null;

            function dragEnd(e) {
                if (!lastPosition) return;

                lastPosition = null;

                e.stopPropagation();

                // 临时拖动需要还原状态
                if (isTempDrag) {
                    dragger.setEnabled(false);
                    isTempDrag = false;
                    if (dragger._minder.getStatus() == 'hand')
                        dragger._minder.rollbackStatus();
                }
                var paper = dragger._minder.getPaper();
                paper.setStyle('cursor', dragger._minder.getStatus() == 'hand' ? '-webkit-grab' : 'default');

                // 真正有拖动才会触发viewchanged
                if (currentPosition) {
                    dragger._minder.fire('viewchanged');
                    currentPosition = null;
                }
            }

            this._minder.on('normal.mousedown normal.touchstart ' +
                'inputready.mousedown inputready.touchstart ' +
                'readonly.mousedown readonly.touchstart',
                function(e) {
                    if (e.originEvent.button == 2) {
                        e.originEvent.preventDefault(); // 阻止中键拉动
                    }
                    // 点击未选中的根节点临时开启
                    if (e.getTargetNode() == this.getRoot()
                        || e.originEvent.button == 2
                        || e.originEvent.altKey
                        || kity.Browser.isMobile()) {
                        lastPosition = e.getPosition('view');
                        isTempDrag = true;
                    }
                })

            .on('normal.mousemove normal.touchmove ' +
                'readonly.mousemove readonly.touchmove ' +
                'inputready.mousemove inputready.touchmove',
                function(e) {
                    if (e.type == 'touchmove') {
                        e.preventDefault(); // 阻止浏览器的后退事件
                    }
                    if (!isTempDrag) return;
                    // 双指缩放时避免拖动
                    if (e.originEvent.touches && e.originEvent.touches.length > 1) return;
                    var offset = kity.Vector.fromPoints(lastPosition, e.getPosition('view'));
                    if (offset.length() > 10) {
                        this.setStatus('hand', true);
                        var paper = dragger._minder.getPaper();
                        paper.setStyle('cursor', '-webkit-grabbing');
                    }
                })

            .on('hand.beforemousedown hand.beforetouchstart', function(e) {
                // 已经被用户打开拖放模式
                if (dragger.isEnabled()) {
                    lastPosition = e.getPosition('view');
                    e.stopPropagation();
                    var paper = dragger._minder.getPaper();
                    paper.setStyle('cursor', '-webkit-grabbing');
                }
            })

            .on('hand.beforemousemove hand.beforetouchmove', function(e) {
                if (lastPosition) {
                    currentPosition = e.getPosition('view');

                    // 当前偏移加上历史偏移
                    var offset = kity.Vector.fromPoints(lastPosition, currentPosition);
                    dragger.move(offset);
                    e.stopPropagation();
                    e.preventDefault();
                    e.originEvent.preventDefault();
                    lastPosition = currentPosition;
                }
            })

            .on('mouseup touchend', dragEnd);

            window.addEventListener('mouseup', dragEnd);
            this._minder.on('contextmenu', function(e) {
                e.preventDefault();
            });
        }
    });

/**
 * 移动视野到指定节点
 *
 * @param {kityminder} km 
 * @param {kityminder.MinderNode} nodes 
 */
function moveToNodesCenter(km, nodes) {
    if (!Array.isArray(nodes)) {
        // 确保是数组，以便统一处理
        nodes = [nodes];
    }
    var viewport = km.getPaper().getViewPort();
    var dxArr = [], dyArr = [];

    nodes.forEach(function(node) {
        var offset = node.getRenderContainer().getRenderBox('view');
        dxArr.push(viewport.center.x - offset.x - offset.width / 2);
        dyArr.push(viewport.center.y - offset.y - offset.height / 2);
    });

    // 对于单个节点，数组中只有一个元素，不会影响计算结果。
    dxArr.sort();
    dyArr.sort();
    var dx = dxArr[0] + (dxArr[dxArr.length - 1] - dxArr[0]) / 2;
    var dy = dyArr[0] + (dyArr[dyArr.length - 1] - dyArr[0]) / 2;
    var dragger = km._viewDragger;
    // var duration = km.getOption('viewAnimationDuration');
    var duration = 100;
    dragger.move(new kity.Point(dx, dy), duration);
}

    Module.register('View', function() {

        var km = this;

        /**
         * @command Hand
         * @description 切换抓手状态，抓手状态下，鼠标拖动将拖动视野，而不是创建选区
         * @state
         *   0: 当前不是抓手状态
         *   1: 当前是抓手状态
         */
        var ToggleHandCommand = kity.createClass('ToggleHandCommand', {
            base: Command,
            execute: function(minder) {

                if (minder.getStatus() != 'hand') {
                    minder.setStatus('hand', true);
                } else {
                    minder.rollbackStatus();
                }
                this.setContentChanged(false);

            },
            queryState: function(minder) {
                return minder.getStatus() == 'hand' ? 1 : 0;
            },
            enableReadOnly: true
        });

        /**
         * @command Camera
         * @description 设置当前视野的中心位置到某个节点上
         * @param {kityminder.MinderNode} focusNode 要定位的节点
         * @param {number} duration 设置视野移动的动画时长（单位 ms），设置为 0 不使用动画
         * @state
         *   0: 始终可用
         */
        var CameraCommand = kity.createClass('CameraCommand', {
            base: Command,
            execute: function(km, focusNode) {
                var node = focusNode || km.getRoot();
                moveToNodesCenter(km, node);
                this.setContentChanged(false);
            },
            enableReadOnly: true
        });

        /**
         * @command showselection
         * @description 将选取拉到视野中间
         * @param {number} duration 设置视野移动的动画时长（单位 ms），设置为 0 不使用动画
         * @state
         *   0: 始终可用
         */
        var ShowSelectionCommand = kity.createClass('ShowSelectionCommand', {
            base: Command,
            execute: function(km) {
                var selectedNodes = km.getSelectedNodes();
                if (selectedNodes.length === 0) return;
                moveToNodesCenter(km, selectedNodes);
                this.setContentChanged(false);
            },
            enableReadOnly: true
        });


        /**
         * @command Move
         * @description 指定方向移动当前视野
         * @param {string} dir 移动方向
         *    取值为 'left'，视野向左移动一半
         *    取值为 'right'，视野向右移动一半
         *    取值为 'up'，视野向上移动一半
         *    取值为 'down'，视野向下移动一半
         * @param {number} duration 视野移动的动画时长（单位 ms），设置为 0 不使用动画
         * @state
         *   0: 始终可用
         */
        var MoveCommand = kity.createClass('MoveCommand', {
            base: Command,

            execute: function(km, dir) {
                var dragger = km._viewDragger;
                var size = km._lastClientSize;
                var duration = km.getOption('viewAnimationDuration');
                switch (dir) {
                    case 'up':
                        dragger.move(new kity.Point(0, size.height / 2), duration);
                        break;
                    case 'down':
                        dragger.move(new kity.Point(0, -size.height / 2), duration);
                        break;
                    case 'left':
                        dragger.move(new kity.Point(size.width / 2, 0), duration);
                        break;
                    case 'right':
                        dragger.move(new kity.Point(-size.width / 2, 0), duration);
                        break;
                }
            },

            enableReadOnly: true
        });

        var movePaper = function (e, minder) {
            var dx, dy;
            if (e.ctrlKey || e.shiftKey) return;
            // 非标准属性，可能在某些浏览器中工作
            if ('wheelDeltaX' in e) {
                dx = e.wheelDeltaX || 0;
                dy = e.wheelDeltaY || 0;
            }
            // 标准属性，应该在大多数现代浏览器中工作
            else if ('deltaX' in e) {
                dx = -e.deltaX || 0;
                dy = -e.deltaY || 0;
            }
            // 如果以上都不可用，退回到wheelDelta
            else {
                dx = 0;
                dy = e.wheelDelta || 0;
            }

            minder._viewDragger.move({
                x: dx / 2.5,
                y: dy / 2.5
            });

            clearTimeout(minder._mousewheeltimer);
            minder._mousewheeltimer = setTimeout(function() {
                minder.fire('viewchanged');
            }, 100);
        }

        return {
            init: function() {
                this._viewDragger = new ViewDragger(this);
            },
            commands: {
                'hand': ToggleHandCommand,
                'camera': CameraCommand,
                'move': MoveCommand,
                'showselection': ShowSelectionCommand,
            },
            events: {
                statuschange: function(e) {
                    this._viewDragger.setEnabled(e.currentStatus == 'hand');
                },
                // 这里是源代码的处理逻辑 如果只是处理滚动 直接监听dom事件即可 不用包装一层minderEvent
                // 先不管
                mousewheel: function(e) {
                    movePaper(e.originEvent, this);
                    e.preventDefault();
                },
                // 双击定位根节点 暂时移除
                // 'normal.dblclick readonly.dblclick': function(e) {
                    // if (e.kityEvent.targetShape instanceof kity.Paper) {
                    //     this.execCommand('camera', this.getRoot(), 800);
                    // }
                // },
                'paperrender finishInitHook': function() {
                    if (!this.getRenderTarget()) {
                        return;
                    }
                    this.execCommand('camera', null, 0);
                    this._lastClientSize = {
                        width: this.getRenderTarget().clientWidth,
                        height: this.getRenderTarget().clientHeight
                    };
                },
                resize: function(e) {
                    var a = {
                            width: this.getRenderTarget().clientWidth,
                            height: this.getRenderTarget().clientHeight
                        },
                        b = this._lastClientSize;
                    this._viewDragger.move(
                        new kity.Point((a.width - b.width) / 2 | 0, (a.height - b.height) / 2 | 0));
                    this._lastClientSize = a;
                },
                'selectionchange layoutallfinish': function(e) {
                    var selected = this.getSelectedNode();
                    var minder = this;

                    /*
                    * Added by zhangbobell 2015.9.9
                    * windows 10 的 edge 浏览器在全部动画停止后，优先级图标不显示 text，
                    * 因此再次触发一次 render 事件，让浏览器重绘
                    * */
                    if (kity.Browser.edge) {
                        this.fire('paperrender');
                    }
                    if (!selected) return;

                    var dragger = this._viewDragger;
                    var timeline = dragger.timeline();

                    /*
                    * Added by zhangbobell 2015.09.25
                    * 如果之前有动画，那么就先暂时返回，等之前动画结束之后再次执行本函数
                    * 以防止 view 动画变动了位置，导致本函数执行的时候位置计算不对
                    *
                    * fixed bug : 初始化的时候中心节点位置不固定（有的时候在左上角，有的时候在中心）
                    * */
                    if (timeline){
                        timeline.on('finish', function() {
                            minder.fire('selectionchange');
                        });

                        return;
                    }


                    var view = dragger.getView();
                    var focus = selected.getLayoutBox();
                    var space = 50;
                    var dx = 0, dy = 0;

                    if (focus.right > view.right) {
                        dx += view.right - focus.right - space;
                    }
                    else if (focus.left < view.left) {
                        dx += view.left - focus.left + space;
                    }

                    if (focus.bottom > view.bottom) {
                        dy += view.bottom - focus.bottom - space;
                    }
                    if (focus.top < view.top) {
                        dy += view.top - focus.top + space;
                    }

                    if (dx || dy) dragger.move(new kity.Point(dx, dy), 100);


                }
            }
        };
    });
});