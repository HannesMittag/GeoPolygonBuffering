import * as geom from 'jsts/org/locationtech/jts/geom';
import * as operation from 'jsts/org/locationtech/jts/operation';

/** 
 * @description
 * class for polygon buffering.
 * 
 * Depends on the jts library for javascript. ( https://github.com/bjornharrtell/jsts )
 * 
*/
export class OffsetPolygonCalculator {

    // #region compute
    /**
     * @description
     * 
     * buffering input polygon with a given offset. Only call this method when
     * the map is already zoomed in, weird results are to expect otherwise.
     * 
     * @returns array of the buffered polygon vertices
     * 
    */
    static compute(polygon: google.maps.LatLng[], map: google.maps.Map, offsetInMeters: number): google.maps.LatLng[] {
        let ret: google.maps.LatLng[] = [];

        if (polygon.length > 2) {
            //project to plane
            let projectedPolygon: number[][] = [];
            for (let latlng of polygon) {
                let point = OffsetPolygonCalculator.latLng2Point(latlng, map);
                projectedPolygon.push([point!.x, point!.y]);
            }

            //meters offset to pixel offset
            let meterFactor: number = OffsetPolygonCalculator.findPixelLengthFactor(polygon[0], polygon[1], map);

            //compute
            let offsetPolygon: number[][] = OffsetPolygonCalculator.computeProjectedPolygonWithOffset(projectedPolygon, offsetInMeters / meterFactor);
            //let offsetPolygon: number[][] = this.computeProjectedPolygonWithOffset(projectedPolygon, offsetInMeters / meterFactor);

            //project to sphere
            for (let point of offsetPolygon) {
                let pointMaps = new google.maps.Point(point[0], point[1]);
                ret.push(OffsetPolygonCalculator.point2LatLng(pointMaps, map)!);
            }
        }

        return ret;
    }

    private static computeProjectedPolygonWithOffset(polygon: number[][], offset: number): number[][] {
        let geoInput = OffsetPolygonCalculator.vectorCoordinates2JTS(polygon);
        geoInput.push(geoInput[0]);

        let geometryFactory = new geom.GeometryFactory();

        let linearRing = geometryFactory.createLinearRing(geoInput);
        let shell = geometryFactory.createPolygon(linearRing, []);
        //let polygonNew = operation.buffer.BufferOp.bufferOp(shell, offset, new operation.buffer.BufferParameters(0, operation.buffer.BufferParameters.CAP_FLAT, operation.buffer.BufferParameters.JOIN_MITRE, 1));
        let polygonNew = operation.buffer.BufferOp.bufferOp(shell, offset, new operation.buffer.BufferParameters(10, operation.buffer.BufferParameters.CAP_FLAT));
        return OffsetPolygonCalculator.JTS2VectorCoordinates(polygonNew.getCoordinates());
    }

    private static findPixelLengthFactor(latLng0: google.maps.LatLng, latLng1: google.maps.LatLng, map: google.maps.Map): number {
        let p0 = OffsetPolygonCalculator.latLng2Point(latLng0, map);

        let p1 = OffsetPolygonCalculator.latLng2Point(latLng1, map);

        let v: number[] = [p1.x - p0.x, p1.y - p0.y];
        let norm: number[] = this.normalize(v);
        norm = [p0.x + norm[0], p0.y + norm[1]];

        let point = new google.maps.Point(norm[0], norm[1]);
        let nLatLng = OffsetPolygonCalculator.point2LatLng(point, map);

        return google.maps.geometry.spherical.computeDistanceBetween(latLng0, nLatLng!);
    }
    // #endregion

    // #region helpers
    //vector shit
    private static difference(v0: number[], v1: number[]): number[] {
        let ret: number[] = [];
        ret.push(v0[0] - v1[0]);
        ret.push(v0[1] - v1[1]);
        return ret;
    }

    private static add(v0: number[], factor: number, v1: number[]): number[] {
        let x0 = v0[0];
        let y0 = v0[1];

        let ret: number[] = [];
        ret.push(v0[0] + factor * v1[0]);
        ret.push(v0[1] + factor * v1[1]);
        return ret;
    }

    private static rotateCw(v0: number[]): number[] {
        let ret: number[] = [];
        ret.push(v0[1]);
        ret.push(-v0[0]);
        return ret;
    }

    private static normalize(v: number[]): number[] {
        let length: number = Math.hypot(v[0], v[1]);
        let ret: number[] = [];
        ret.push(v[0] / length);
        ret.push(v[1] / length);
        return ret;
    }

    private static calculateVectorLength(x0: number, y0: number, x1: number, y1: number): number {
        return x0 * y1 - y0 * x1;
    }

    private static vectorCoordinates2JTS(polygon: number[][]): geom.Coordinate[] {

        let coordinates = [];
        for (let point of polygon) {
            coordinates.push(new geom.Coordinate(point[0], point[1]));
        }
        return coordinates;
    }

    private static JTS2VectorCoordinates(jtsCoordinates: geom.Coordinate[]): number[][] {

        let ret: number[][] = [];
        for (let coord of jtsCoordinates) {
            ret.push([coord.x, coord.y]);
        }
        return ret;
    }

    // #region projection
    private static latLng2Point(latLng: google.maps.LatLng, map: google.maps.Map) {
        var topRight = map.getProjection()!.fromLatLngToPoint(map.getBounds()!.getNorthEast());
        var bottomLeft = map.getProjection()!.fromLatLngToPoint(map.getBounds()!.getSouthWest());
        var scale = Math.pow(2, map.getZoom()!);
        var worldPoint = map.getProjection()!.fromLatLngToPoint(latLng);
        return new google.maps.Point((worldPoint!.x - bottomLeft!.x) * scale, (worldPoint!.y - topRight!.y) * scale);
    }

    private static point2LatLng(point: google.maps.Point, map: google.maps.Map) {
        var topRight = map.getProjection()!.fromLatLngToPoint(map.getBounds()!.getNorthEast());
        var bottomLeft = map.getProjection()!.fromLatLngToPoint(map.getBounds()!.getSouthWest());
        var scale = Math.pow(2, map.getZoom()!);
        var worldPoint = new google.maps.Point(point.x / scale + bottomLeft!.x, point.y / scale + topRight!.y);
        return map.getProjection()!.fromPointToLatLng(worldPoint!);
    }
    // #endregion
    // #endregion


}
