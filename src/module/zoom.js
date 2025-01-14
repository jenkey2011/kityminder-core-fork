define(function(require, exports, module) {
    var kity = require('../core/kity');
    var utils = require('../core/utils');

    var Minder = require('../core/minder');
    var MinderNode = require('../core/node');
    var Command = require('../core/command');
    var Module = require('../core/module');
    var Renderer = require('../core/render');

    Module.register('Zoom', function() {
        var me = this;

        var timeline;

        function setTextRendering() {
            var value = me._zoomValue >= 100 ? 'optimize-speed' : 'geometricPrecision';
            me.getRenderContainer().setAttr('text-rendering', value);
        }

        function fixPaperCTM(paper) {
            var node = paper.shapeNode;
            var ctm = node.getCTM();
            var matrix = new kity.Matrix(ctm.a, ctm.b, ctm.c, ctm.d, (ctm.e | 0) + 0.5, (ctm.f | 0) + 0.5);
            node.setAttribute('transform', 'matrix(' + matrix.toString() + ')');
        }

        kity.extendClass(Minder, {
            zoom: function(value) {
                var paper = this.getPaper();
                var viewport = paper.getViewPort();
                viewport.zoom = value / 100;
                viewport.center = {
                    x: viewport.center.x,
                    y: viewport.center.y
                };
                paper.setViewPort(viewport);
                if (value == 100) fixPaperCTM(paper);
            },
            getZoomValue: function() {
                return this._zoomValue;
            }
        });

        function zoomMinder(minder, value) {
            var paper = minder.getPaper();
            var viewport = paper.getViewPort();

            if (!value) return;

            setTextRendering();

            var duration = minder.getOption('zoomAnimationDuration');
            if (minder.getRoot().getComplex() > 200 || !duration) {
                minder._zoomValue = value;
                minder.zoom(value);
                minder.fire('viewchange');
            } else {
                var animator = new kity.Animator({
                    beginValue: minder._zoomValue,
                    finishValue: value,
                    setter: function(target, value) {
                        target.zoom(value);
                    }
                });
                minder._zoomValue = value;
                if (timeline) {
                    timeline.pause();
                }
                timeline = animator.start(minder, duration, 'easeInOutSine');
                timeline.on('finish', function() {
                    // minder.fire('viewchange');
                    minder.fire('viewchanged');
                });
            }
            minder.fire('zoom', {
                zoom: value
            });
        }

        function zoomMinderDirectly(minder, value) {
            var zoom = minder.getOption('zoom');
            var min = zoom[0], max = zoom[zoom.length - 1];
            var scale = Math.max(min, Math.min(value, max));
            if (isNaN(scale)) return;
            if (scale === minder._zoomValue) return;
            minder.zoom(scale);
            minder._zoomValue = scale;
            minder.fire('viewchang');
            minder.fire('zoom', {
                zoom: scale
            });
        }

        /**
         * @command Zoom
         * @description 缩放当前的视野到一定的比例（百分比）
         * @param {number} value 设置的比例，取值 100 则为原尺寸
         * @state
         *   0: 始终可用
         */
        var ZoomCommand = kity.createClass('Zoom', {
            base: Command,
            execute: zoomMinder,
            queryValue: function(minder) {
                return minder._zoomValue;
            }
        });

        /**
         * @command ZoomIn
         * @description 放大当前的视野到下一个比例等级（百分比）
         * @shortcut =
         * @state
         *   0: 如果当前脑图的配置中还有下一个比例等级
         *  -1: 其它情况
         */
        var ZoomInCommand = kity.createClass('ZoomInCommand', {
            base: Command,
            execute: function(minder) {
                zoomMinder(minder, this.nextValue(minder));
            },
            queryState: function(minder) {
                return +!this.nextValue(minder);
            },
            nextValue: function(minder) {
                var stack = minder.getOption('zoom'),
                    i;
                for (i = 0; i < stack.length; i++) {
                    if (stack[i] > minder._zoomValue) return stack[i];
                }
                return 0;
            },
            enableReadOnly: true
        });

        /**
         * @command ZoomOut
         * @description 缩小当前的视野到上一个比例等级（百分比）
         * @shortcut -
         * @state
         *   0: 如果当前脑图的配置中还有上一个比例等级
         *  -1: 其它情况
         */
        var ZoomOutCommand = kity.createClass('ZoomOutCommand', {
            base: Command,
            execute: function(minder) {
                zoomMinder(minder, this.nextValue(minder));
            },
            queryState: function(minder) {
                return +!this.nextValue(minder);
            },
            nextValue: function(minder) {
                var stack = minder.getOption('zoom'),
                    i;
                for (i = stack.length - 1; i >= 0; i--) {
                    if (stack[i] < minder._zoomValue) return stack[i];
                }
                return 0;
            },
            enableReadOnly: true
        });

        var lastDistance = 0,
            initialDistance = 0,
            initialZommValue = 0;

        return {
            init: function() {
                this._zoomValue = 100;
                this.setDefaultOptions({
                    zoom: [10, 20, 50, 100, 200]
                });
                setTextRendering();
            },
            commands: {
                'zoomin': ZoomInCommand,
                'zoomout': ZoomOutCommand,
                'zoom': ZoomCommand
            },
            events: {
                'normal.beforetouchstart': function(e) {
                    var touches = e.originEvent.touches;
                    if (touches && touches.length === 2) {
                        initialZommValue = this.getZoomValue();
                        initialDistance = Math.hypot(
                            touches[0].pageX - touches[1].pageX,
                            touches[0].pageY - touches[1].pageY
                        );
                    }
                },

                'normal.beforetouchmove': function(e) {
                    var touches = e.originEvent.touches;
                    if (touches && touches.length === 2) {
                        lastDistance = Math.hypot(
                            touches[0].pageX - touches[1].pageX,
                            touches[0].pageY - touches[1].pageY
                        );

                        var zoom = lastDistance / initialDistance;
                        var scale = Math.round(initialZommValue * zoom);
                        zoomMinderDirectly(this, scale);
                    }
                },

                'touchend': function() {
                    if (lastDistance) {
                        this.fire('viewchanged');
                    }
                    lastDistance = 0;
                    initialDistance = 0;
                    initialZommValue = 0;
                },

                'normal.mousewheel readonly.mousewheel': function(e) {
                    if (!e.originEvent.ctrlKey && !e.originEvent.metaKey) return;
                    var delta = e.originEvent.deltaY;
                    var step = Math.abs(delta) > 0 ? Math.abs(Math.round(delta)) : 1;
                    var curZoom = this.getZoomValue();
                    var scale = delta < 0 ? curZoom + step : curZoom - step;
                    zoomMinderDirectly(this, scale);
                    e.originEvent.preventDefault();
                }
            },

            commandShortcutKeys: {
                'zoomin': 'ctrl+=',
                'zoomout': 'ctrl+-'
            }
        };
    });
});