/**
 * @file Relation Render
 */
define(function(require, exports, module) {
    var kity = require('./kity');
    var MinderRelation = require('./relation');
    var PointGroup = require('./point');
    var utils = require('./utils');

    var markerMap = {
        createDotMarker: function() {
            return new kity.Marker().pipe(function() {
                var r = 6;
                var dot = new kity.Circle(r);
                this.addShape(dot);
                this.setRef(r, 0).setViewBox(-r, -r, r + r, r + r).setWidth(r).setHeight(r);
                this.shape = dot;
                this.node.setAttribute('markerUnits', 'userSpaceOnUse');
            });
        },

        creatRightMarker: function() {
            return new kity.Marker().pipe(function() {
                var w = 8, half = w / 2;
                var shape = new kity.Path('M0,0 L0,' + w + ' L' + w + ',' + half + ' z');
                this.addShape(shape);
                this.setRef(half, half).setViewBox(0, 0, w, w).setWidth(w).setHeight(w);
                this.shape = shape;
                this.node.setAttribute('markerUnits', 'userSpaceOnUse');
            });
        },

        creatLeftMarker: function() {
            return new kity.Marker().pipe(function() {
                var w = 8, half = w / 2;
                var shape = new kity.Path('M0,' + half + ' L' + w + ',' + w + ' L' + w + ',0 z');
                this.addShape(shape);
                this.setRef(half, half).setViewBox(0, 0, w, w).setWidth(w).setHeight(w);
                this.shape = shape;
                this.node.setAttribute('markerUnits', 'userSpaceOnUse');
            });
        }
    };

    kity.extendClass(MinderRelation, {
        create:function(){
            this.line = new kity.Bezier();
            this.lineCopy = new kity.Bezier();
            this.pointGroup = new PointGroup().setVisible(false);
            this.textGroup = new kity.Group();
            this.rc.setStyle('pointer-events', 'none');
            this.rc.addShapes([this.lineCopy,this.line,this.textGroup,this.pointGroup]);
            this.creatMarker();
            initListener(this);
        },

        creatMarker: function() {
            var minder = this.getMinder();
            this.rightMarker = markerMap.creatRightMarker();
            this.leftMarker = markerMap.creatLeftMarker();
            this.dotMarker = markerMap.createDotMarker();
            minder.getPaper().addResource(this.rightMarker);
            minder.getPaper().addResource(this.leftMarker);
            minder.getPaper().addResource(this.dotMarker);
        },

        setControllerPoint: function(index, point) {
            var controller = 'controller' + index;
            this.setData(controller, {
                x:point.x,
                y:point.y
            });
            return this;
        },

        setTextPosition: function() {
            var _contentBox = this._contentBox;
            var pos = kity.g.pointAtPath(this.getLine().pathdata, 0.5)
                .offset(_contentBox.width / 2 * -1, _contentBox.height / 2 * -1);
            this.textGroup.setTranslate(pos);
        },

        drawLineCopy: function() {
            var points = this.line.getBezierPoints();
            var copyPoints =[];
            points.forEach(function(point) {
                copyPoints.push(point.clone());
            });
            this.lineCopy
                .setBezierPoints(copyPoints)
                .stroke('rgba(41, 122, 255, .2)', 10)
                .setStyle('opacity', 0)
                .setAttr('stroke-linejoin', 'round')
                .setAttr('stroke-linecap', 'round');
        },

        render: function() {
            var km = this.getMinder();
            var options = km.getOption('relations') || {};
            this.pointGroup.setVisible(options.edit && this.isSelected() && km.getStatus() !== 'readonly');
            this.textGroup.setVisible(this.data.text || (this.isSelected() && this.getMinder().getStatus() !== 'readonly'));
            this.lineCopy.setStyle('opacity', this.isSelected() ? 1 : 0);
            if (km.isFocused()) {
                this.pointGroup.items.forEach(function(item){
                    item.stroke('#2970FF');
                });
            }
        },

        preSelect:function(){
            this.textGroup.setVisible(true);
            this.lineCopy.setStyle('opacity', 1);
            var _this = this;
            this.rc.once('mouseleave', function() {
                if(_this.isSelected()) return;
                _this.textGroup.setVisible(_this.data.text);
                _this.lineCopy.setStyle('opacity', 0);
            });
        }
    });

    function initListener(relation) {
        var km = relation.getMinder();
        var _this = relation;
        km.on('mousemove', function(e) {
            var mousePoint = null,
                currentPoint = null,
                pointIndex = -1;
            e.preventDefault();

            if (!relation.editable) {
                return;
            }

            mousePoint = e.getPosition();
            pointIndex = relation._modifyStatus.pointIndex;
            currentPoint = _this.pointGroup.getPointByIndex(pointIndex);
            switch (relation._modifyStatus.pointType) {

                case PointGroup.TYPE_FORWARD:
                    currentPoint.setForward(mousePoint.x, mousePoint.y);
                    _this.getLine().getPoint(pointIndex).setForward(mousePoint.x, mousePoint.y);
                    _this.setControllerPoint(pointIndex, currentPoint.getForward());
                    relation.update();
                    break;

                case PointGroup.TYPE_BACKWARD:
                    currentPoint.setBackward(mousePoint.x, mousePoint.y);
                    _this.getLine().getPoint(pointIndex).setBackward(mousePoint.x, mousePoint.y);
                    _this.setControllerPoint(pointIndex, currentPoint.getBackward());
                    relation.update();
                    break;

                case PointGroup.TYPE_VERTEX:
                    var point = mousePoint;
                    var node = getClosestNode(km, mousePoint);
                    if (node) {
                        var box = node.getLayoutBox();
                        var per = getPointPercentage(box, mousePoint);
                        var point = utils.getPointAtPath(node, per);
                        if (node !== relation.getFromNode() && node !== relation.getToNode()) {
                            if (pointIndex == 0) {
                                relation.setData('from', node.getData('id'));
                            }
                            else {
                                relation.setData('to', node.getData('id'));
                            }
                        }

                        // 端点移动后将更新端点位置
                        // 当存在端点位置时，移动控制点，将不在同步更新端点位置
                        if (pointIndex == 0) {
                            relation.setData('fromPoint', per);
                        }
                        else {
                            relation.setData('toPoint', per);
                        }
                    }

                    currentPoint.moveTo(point.x, point.y);
                    _this.getLine().getPoint(pointIndex).moveTo(point.x, point.y);
                    _this.setTextPosition();
                    break;
            }
        });

        km.on('mouseup', function() {
            if (!relation.editable) {
                return;
            }

            relation.disableEdit();
            relation.update();
            km.fire('contentchange');
        });
    }

    // 获取离鼠标位置最近的Node节点
    // 最近是指，鼠标点周围15像素内的节点
    function getClosestNode(km, mousePoint) {
        var distance = 15;
        var area = new kity.Box(mousePoint.x - distance, mousePoint.y - distance, distance * 2, distance * 2);
        var selectedNode;
        if (selectedNode) return selectedNode;

        km.getRoot().traverse(function(node) {
            var renderBox = node.getLayoutBox();
            if (!renderBox.intersect(area).isEmpty()) {
                selectedNode = node;
            }
        });

        return selectedNode;
    }

    // 获取百分比
    function getPointPercentage(nodeBox, mousePoint) {
        var angle = calculateAngle(nodeBox, {x: nodeBox.cx, y: nodeBox.cy}, mousePoint);
        var percentage = angle / 360;
        return percentage.toFixed(2);
    }

    // p1 起点
    // p2 中点
    // p3 鼠标点
    function calculateAngle(p1, p2, p3) {
        // 计算向量
        var p1p = { x: p2.x - p1.x, y: p2.y - p1.y };
        var p2p = { x: p2.x - p3.x, y: p2.y - p3.y };

        // 计算与x轴的角度
        var angle1 = Math.atan2(p1p.y, p1p.x);
        var angle2 = Math.atan2(p2p.y, p2p.x);

        // 计算两个角度的差异（弧度）
        var angleDiff = angle2 - angle1;

        // 转换为度数
        angleDiff = angleDiff * (180 / Math.PI);

        // 角度调整到0-360度范围
        if (angleDiff < 0) {
            angleDiff += 360;
        }

        return angleDiff;
      }
});
