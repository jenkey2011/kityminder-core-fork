// @ts-ignore
define(function(require, exports, module) {
    const kity = require('./kity');
    const utils = require("./utils");
    const Minder = require('./minder');
    const MinderRelation = require('./relation');
    const Module = require('./module');
    const Command = require('./command');

    const dashStyleMap = {
        solid: '0',
        sysDash: '2',
        sysDot: '2',
        dash: '4 2',
        dashDot: '4 2 2 2',
        dashDotDot: '4 2 2 2',
    };

    Module.register('relationBezier', function() {
        var UpdateRelationLine = kity.createClass('UpdateRelationLineCommand', {
            base: Command,
            execute: function(km, key, value) {
                var nodes = km.getSelectedRelations();
                nodes.forEach(function(n) {
                    n.setData(key, value);
                    n.render();
                });
            },
            queryState: function(km) {
                return km.getSelectedRelations().length === 0 ? -1 : 0;
            },
            queryValue: function(km, key) {
                if (km.getSelectedRelations().length === 1) {
                    return km.getSelectedRelation().getData(key);
                }
                return 'mixed';
            }
        });

        var ClearRelationTextStyle = kity.createClass('ClearRelationTextStyleCommand', {
            base: Command,
            execute: function(km) {
                var nodes = km.getSelectedRelations();
                nodes.forEach(function(n) {
                    n.setDefaultTextStyle();
                    n.render();
                });
            }
        });

        // 字体大小调整
        var UpdateRelationFontSize =  kity.createClass('updaterelationfontsizeCommand', {
                    base: Command,

                    execute: function(km, diff) {
                        var nodes = km.getSelectedRelations();
                        nodes.forEach(function(n) {
                            var oriSize = n.getData('font-size') || n.getStyle('font-size');
                            var size = parseFloat(oriSize) + +diff;
                            size = Math.max(9, Math.min(96, size));
                            n.setData('font-size', size);
                            n.render();
                            km.layout(300);
                        });
                    }
                })

        return {
            commands: {
                'updateRelationLine': UpdateRelationLine,
                'updateRelationText': UpdateRelationLine,
                'clearRelationTextStyle': ClearRelationTextStyle,
                'updateRelationFontSize': UpdateRelationFontSize
            },
            events: {
                'normal.mousemove': function(e) {
                    var relationNode = e.getTargetRelationNode();
                    if (!relationNode) return;
                    if (relationNode.isSelected()) return;
                    relationNode.preSelect();
                },
                'blur': function() {
                    if (!this.isFocused()) {
                        this.removeAllRelationSelected();
                    }
                },
                'focus': function() {
                    if (this.isFocused()) {
                        this._selectedRelation.forEach(function(relation){
                            relation.pointGroup.items.forEach(function(item){
                                item.stroke('#2970FF');
                            });
                        })
                    }
                }
            }
        }
    });

    kity.extendClass(MinderRelation, {
        updateLine: function(targetNodeOrPosition) {
            var _this = this;
            var bezierData = this.getBezierData(targetNodeOrPosition);
            var points = bezierData.points;
            var controllers = bezierData.controller;
            this.getLine().setBezierPoints(points);
            this.getLine().getBezierPoints().forEach(function(item, index) {
                var controller = {
                    x: controllers[index].x,
                    y: controllers[index].y,
                }
                if (index === 0) {
                    _this.pointGroup.addPoint(points[index].clone(), index).setForward(controller.x, controller.y);
                    item.setForward(controller.x, controller.y);
                }
                else if(index === 1) {
                    _this.pointGroup.addPoint(points[index].clone(), index).setBackward(controller.x, controller.y);
                    item.setBackward(controller.x, controller.y);
                }
            });

            this.drawLineCopy(points);
            this.updateLineStyle();
        },

        updateLineStyle: function() {
            var line = this.getLine();
            var strokeWidth = this.getData('line-width');
            var strokeColor = this.getData('line-color');
            var fromMarkerName = this.getData('from-marker');
            var toMarkerName = this.getData('to-marker');
            var strokeStyle = this.getData('line-style');
            var markerMap = {
                start: {
                    dot: this.dotMarker,
                    arrow: this.leftMarker,
                },
                end: {
                    dot: this.dotMarker,
                    arrow: this.rightMarker,
                },
            };

            line.stroke(strokeColor, strokeWidth)
                .setAttr('stroke-dasharray',  dashStyleMap[strokeStyle]);

            ['end', 'start'].forEach(function(pos) {
                var marker = markerMap[pos][pos === 'start' ? fromMarkerName : toMarkerName];
                line.setMarker(marker, pos);
                if (marker) {
                    marker.shape.fill(strokeColor);
                }
            });
        },

        getBezierData: function(targetNodeOrPosition) {
            var bezierData = utils.bezierPoint(this, targetNodeOrPosition);
            var fromPoint = bezierData.from,
                toPoint = bezierData.to;
            return {
                points: [
                    new kity.BezierPoint(fromPoint.x, fromPoint.y, true),
                    new kity.BezierPoint(toPoint.x, toPoint.y, true),
                ],
                controller: [
                    bezierData.fromController,
                    bezierData.toController,
                ]
            }
        },
    });
});
