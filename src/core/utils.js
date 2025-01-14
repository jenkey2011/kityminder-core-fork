define(function(require, exports) {
    var kity = require('./kity');
    var uuidMap = {};

    exports.extend = kity.Utils.extend.bind(kity.Utils);
    exports.each = kity.Utils.each.bind(kity.Utils);

    exports.uuid = function(group) {
        uuidMap[group] = uuidMap[group] ? uuidMap[group] + 1 : 1;
        return group + uuidMap[group];
    };

    exports.guid = function() {
        return (+new Date() * 1e6 + Math.floor(Math.random() * 1e6)).toString(36);
    };

    exports.trim = function(str) {
        return str.replace(/(^[ \t\n\r]+)|([ \t\n\r]+$)/g, '');
    };

    exports.keys = function(plain) {
        var keys = [];
        for (var key in plain) {
            if (plain.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    };

    exports.clone = function(source) {
        return JSON.parse(JSON.stringify(source));
    };

    exports.comparePlainObject = function(a, b) {
        return JSON.stringify(a) == JSON.stringify(b);
    };

    exports.encodeHtml = function(str, reg) {
        return str ? str.replace(reg || /[&<">'](?:(amp|lt|quot|gt|#39|nbsp);)?/g, function(a, b) {
            if (b) {
                return a;
            } else {
                return {
                    '<': '&lt;',
                    '&': '&amp;',
                    '"': '&quot;',
                    '>': '&gt;',
                    '\'': '&#39;'
                }[a];
            }
        }) : '';
    };

    exports.clearWhiteSpace = function(str) {
        return str.replace(/[\u200b\t\r\n]/g, '');
    };

    exports.camelCaseToKebabCase = function(str) {
        return str.replace(/([a-z\d])([A-Z]+)/g, function(match, lowerCase, upperCase) {
            return lowerCase + '-' + upperCase.toLowerCase();
        }).toLowerCase();
    };

    exports.each(['String', 'Function', 'Array', 'Number', 'RegExp', 'Object'], function(v) {
        var toString = Object.prototype.toString;
        exports['is' + v] = function(obj) {
            return toString.apply(obj) == '[object ' + v + ']';
        };
    });

    function countNodes (node) {
        var count = 0;
        // 如果节点存在子节点
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            // 递归调用函数，计算子节点的子节点数量
            count += countNodes(child);
        }

        // 返回节点数量（包括当前节点）
        return count + 1;
    }

    exports.countNodes = countNodes;

    // 节流函数 (Throttle)
    function throttle(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            if (!timeout) {
                timeout = setTimeout(function() {
                    timeout = null;
                }, wait);
                func.apply(context, args);
            }
        };
    }

    // 防抖函数 (Debounce)
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
    exports.throttle = throttle;
    exports.debounce = debounce;

    /**
     * 生成向量。
     *
     * @param {number} [x=0]
     * @param {number} [y=0]
     */
    function Vec2(x, y) {
        if(x && typeof x === 'object') {
            y = x.y;
            x = x.x;
        }
        this.x = x || 0;
        this.y = y || 0;
    }

    var bezierLength = {
        p: function(x, y) {
            return new Vec2(x, y)
        },
        /**
         *  返回两个向量的差。
         * @method pSub
         * @param {Vec2} v1
         * @param {Vec2} v2
         * @return {Vec2}
         * @example
         */
        pSub: function(v1, v2) {
            return this.p(v1.x - v2.x, v1.y - v2.y);
        },
        /**
         *  两个向量之间进行点乘。
         * @method pDot
         * @param {Vec2} v1
         * @param {Vec2} v2
         * @return {Number}
         * @example
         */
        pDot: function(v1, v2) {
            return v1.x * v2.x + v1.y * v2.y;
        },
        /**
         *  返回指定向量长度的平方。
         * @method pLengthSQ
         * @param  {Vec2} v
         * @return {Number}
         * @example
         * cc.pLengthSQ(cc.v2(20, 20)); // 800;
         */
        pLengthSQ: function(v) {
            return this.pDot(v, v);
        },

        /**
         *  返回两个点之间距离的平方。
         * @method pDistanceSQ
         * @param {Vec2} point1
         * @param {Vec2} point2
         * @return {Number}
         * @example
         * var point1 = v2(20, 20);
         * var point2 = v2(5, 5);
         * pDistanceSQ(point1, point2); // 450;
         */
        pDistanceSQ: function(point1, point2) {
            return this.pLengthSQ(this.pSub(point1, point2));
        },
        /**
         * 
         *
         * @param {*} cp
         * @param {*} t
         * @returns
         */
        pointOnCubicBezier: function(cp, t) {
            var ax, bx, cx;
            var ay, by, cy;
            var tSquared, tCubed;
            var result = {}

            /*計算多項式係數*/

            cx = 3.0 * (cp[1].x - cp[0].x);
            bx = 3.0 * (cp[2].x - cp[1].x) - cx;
            ax = cp[3].x - cp[0].x - cx - bx;

            cy = 3.0 * (cp[1].y - cp[0].y);
            by = 3.0 * (cp[2].y - cp[1].y) - cy;
            ay = cp[3].y - cp[0].y - cy - by;

            /*計算位於參數值t的曲線點*/

            tSquared = t * t;
            tCubed = tSquared * t;

            result.x = (ax * tCubed) + (bx * tSquared) + (cx * t) + cp[0].x;
            result.y = (ay * tCubed) + (by * tSquared) + (cy * t) + cp[0].y;

            return result
        },
        /**
         * !#en Test line and line
         * !#zh 线段与线段的交点
         * @method lineLine
         * @param {Vec2} a1 - The start point of the first line
         * @param {Vec2} a2 - The end point of the first line
         * @param {Vec2} b1 - The start point of the second line
         * @param {Vec2} b2 - The end point of the second line
         * @return {boolean}
         */
        lineLine: function(a1, a2, b1, b2) {
            var result;
            var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
            var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
            var u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
            if(u_b != 0) {
                var ua = ua_t / u_b;
                var ub = ub_t / u_b;
                if(0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
                    result = (new Vec2(a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)));
                } else {}
            } else {
                if(ua_t == 0 || ub_t == 0) {} else {}
            }
            return result;

        },

        /**
         * !#en Test line and rect
         * !#zh 矩形与线段的交点
         * @method lineRect
         * @param {Vec2} a1 - The start point of the line
         * @param {Vec2} a2 - The end point of the line
         * @param {Rect} b - The rect
         * @return {boolean}
         */
        lineRect: function(a1, a2, b) {
            var points = ''
            var r0 = new Vec2(b.x, b.y);
            var r1 = new Vec2(b.x, b.yMax);
            var r2 = new Vec2(b.xMax, b.yMax);
            var r3 = new Vec2(b.xMax, b.y);

            if(this.lineLine(a1, a2, r0, r1))
                points = this.lineLine(a1, a2, r0, r1)

            else if(this.lineLine(a1, a2, r1, r2))
                points = this.lineLine(a1, a2, r1, r2)

            else if(this.lineLine(a1, a2, r2, r3))
                points = this.lineLine(a1, a2, r2, r3)

            else if(this.lineLine(a1, a2, r3, r0))
                points = this.lineLine(a1, a2, r3, r0)


            if(!points) {
                var rn = kity.Vector.fromPoints(a1, a2);
                var points = bezierLength.lineRect(a1, {
                    x: a2.x + rn.x+1,
                    y: a2.y + rn.y+1
                }, b);
            }
            return points;
        }
    }

    // 根据两端点，计算第三个点与该连线对应夹角的坐标
    function calculatePoint(p1, p2, angle, len) {
        var angleRad = angle * (Math.PI / 180);
        var theta = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        var thetaPrime = theta - angleRad;
        var x3 = p1.x + len * Math.cos(thetaPrime);
        var y3 = p1.y + len * Math.sin(thetaPrime);
        return {x: x3, y: y3};
    }

    function getController(fromBox, toBox) {
        var xRagnge = 300, yRange = 200;
        var ratio = 0.5, angle = 30;
        var fromPoint, toPoint, fromController, toController;
        var vector = kity.Vector.fromPoints({x: fromBox.cx, y: fromBox.cy}, {x: toBox.cx, y: toBox.cy});
        var distance = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        var xDistance = vector.x < 0 ? fromBox.right - toBox.cx : toBox.cx - fromBox.left;

        if (xDistance <= fromBox.width + 40) {
            // 上下连接
            if (Math.abs(vector.y) > yRange) {
                fromPoint = {x: fromBox.cx, y: vector.y < 0 ? fromBox.top : fromBox.bottom};
                toPoint = {x: toBox.cx, y: vector.y < 0 ? toBox.bottom : toBox.top};
                fromController = calculatePoint(fromPoint, toPoint, angle, distance * ratio);
                toController = calculatePoint(toPoint, fromPoint, angle, distance * ratio);
            }
            // 右右连接
            else {
                var isLeft = fromBox.cx < 0 && toBox.cx < 0;
                fromPoint = {x: isLeft ? fromBox.left : fromBox.right, y: fromBox.cy};
                toPoint = {x: isLeft ? toBox.left : toBox.right, y: toBox.cy};
                fromController = {x: fromPoint.x + distance * ratio * (isLeft ? -1 : 1), y: fromPoint.y};
                toController = {x: toPoint.x + distance * ratio * (isLeft ? -1 : 1), y: toPoint.y};
            }
        }
        else if (xDistance <= xRagnge) {
            // 上下连接
            if (Math.abs(vector.y) > yRange) {
                fromPoint = {x: fromBox.cx, y: vector.y < 0 ? fromBox.top : fromBox.bottom};
                toPoint = {x: toBox.cx, y: vector.y < 0 ? toBox.bottom : toBox.top};
                fromController = calculatePoint(fromPoint, toPoint, angle, distance * ratio);
                toController = calculatePoint(toPoint, fromPoint, angle, distance * ratio);
            }
                // 上上连接
            else {
                fromPoint = {x: fromBox.cx, y: fromBox.top};
                toPoint = {x: toBox.cx, y: toBox.top};
                fromController = {x: fromPoint.x, y: fromPoint.y - distance * ratio};
                toController = {x: toPoint.x, y: toPoint.y - distance * ratio};
            }
        }
        else {
            // 左右连接
            if (Math.abs(vector.y) > yRange) {
                fromPoint = {x: fromBox.cx, y: vector.y < 0 ? fromBox.top : fromBox.bottom};
                toPoint = {x: toBox.cx, y: vector.y < 0 ? toBox.bottom : toBox.top};
                fromController = calculatePoint(fromPoint, toPoint, angle, distance * ratio);
                toController = calculatePoint(toPoint, fromPoint, angle, distance * ratio);
            }
                // 上下连接
            else {
                fromPoint = {x: vector.x < 0 ? fromBox.left : fromBox.right, y: fromBox.cy};
                toPoint = {x: vector.x < 0 ? toBox.right : toBox.left, y: toBox.cy};
                fromController = calculatePoint(fromPoint, toPoint, angle, distance * ratio);
                toController = calculatePoint(toPoint, fromPoint, angle, distance * ratio);
            }
        }

        return {
            fromPoint: fromPoint,
            toPoint: toPoint,
            fromController: fromController,
            toController: toController
        };
    }

    // 求联系线 开始点+结束点+控制点
    exports.bezierPoint = function(relation, targetNodeOrPosition) {
        var fromNode = relation.getFromNode();
        var toNode = relation.getToNode() || targetNodeOrPosition || {x: 0, y: 0};
        var fromBox = fromNode.getLayoutBox();
        var toBox;
        if (toNode.__KityClassName == 'MinderNode') {
            toBox = toNode.getLayoutBox();
        }
        else {
            toBox = {
                cx:  toNode.x,
                cy: toNode.y,
                x: toNode.x,
                y: toNode.y,
                left: toNode.x,
                right: toNode.x,
                top: toNode.y,
                bottom: toNode.y,
            };
        }

        var fromPoint, toPoint;
        var fromController, toController;

        if (relation.data.controller0 && (relation.data.controller0.x || relation.data.controller0.y)) {
            fromController = relation.data.controller0;
        }

        if (relation.data.controller1 && (relation.data.controller1.x || relation.data.controller1.y)) {
            toController = relation.data.controller1;
        }

        if (relation.data.fromPoint >= 0) fromPoint = getPointAtPath(fromNode, relation.data.fromPoint);
        if (relation.data.toPoint >= 0) toPoint = getPointAtPath(toNode, relation.data.toPoint);

        var controls = getController(fromBox, toBox);

        if (!fromController) fromController = controls.fromController;
        if (!toController) toController = controls.toController;
        if (!fromPoint) fromPoint = controls.fromPoint;
        if (!toPoint) toPoint = controls.toPoint;

        return {
            from: fromPoint,
            to: toPoint,
            fromController: fromController,
            toController: toController,
        };
    };

    // 工具方法， 检测贝塞尔曲线上的点的控制点和顶点是否重叠在一起
    // 参数distance控制了点之间的最小距离， 如果不大于该距离， 则认为是重叠的
    // 返回值有： 0： 无重叠， 1： forward重叠， 2： backward重叠
    exports.checkOverlapping = function(bezierPoint, distance) {
        var forward = bezierPoint.getForward(),
            backward = bezierPoint.getBackward(),
            vertex = bezierPoint.getVertex();
        if(kity.Vector.fromPoints(forward, vertex).length() <= distance) {
            // forward重叠
            return 1;
        } else if(kity.Vector.fromPoints(backward, vertex).length() <= distance) {
            // backward重叠
            return 2;
        }
        // 无重叠
        return 0;
    };

    exports.lineToRect = function(a1,a2,r){
        return bezierLength.lineRect(a1,a2,r);
    };

    exports.omitEmptyKey = function(obj) {
        var ret = {};
        for (var key in obj) {
            if (!obj[key]) continue;
            ret[key] = obj[key];
        }
        return ret;
    };

    exports.convertToRGBA = function (color) {
        if (color.startsWith("rgba")) {
            return color;
        }

        if (color.startsWith("rgb")) {
            var rgbValues = color.match(/\d+/g);
            return 'rgba(' + rgbValues[0] + ', ' + rgbValues[1] + ', ' + rgbValues[2] + ', 1)';
        }

        if (color.startsWith("#")) {
            var hex = color.slice(1);

            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            // return `rgba(${r}, ${g}, ${b}, 1)`;
            return 'rgba(' + r + ',' + g + ',' + b + ', 1)';
        }

        return "Invalid color format";
    };

    // 获取node节点边长百分比下的Point点
    function getPointAtPath(node, per) {
        var shapeNode = node.getRenderer('OutlineRenderer')._renderShape.node;
        var length = shapeNode.getTotalLength() * (per - .07);
        var point =  shapeNode.getPointAtLength(length);
        var newPoint = node.getLayoutPoint().offset(point);
        return newPoint;
    }

    exports.getColorForIndex = function(index, segmentIndex, segmentColor) {
        var cleanedSegmentColor = [];
        for (var j = 0; j < segmentColor.length; j++) {
            cleanedSegmentColor.push(segmentColor[j].replace(/\s/g, ''));
        }

        for (var i = 0; i < segmentIndex.length; i++) {
            if (i === 0 && index <= segmentIndex[i]) {
                return cleanedSegmentColor[i].split('-');
            } else if (i > 0 && index <= segmentIndex[i] && index > segmentIndex[i - 1]) {
                return cleanedSegmentColor[i].split('-');
            }
        }

        return segmentColor[segmentColor.length - 1].split('-');
    };
    exports.getPointAtPath = getPointAtPath;
});
