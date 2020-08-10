import { Vector } from './math/index';

// # class Vertex
// Represents a vertex of a polygon. Use your own vertex class instead of this
// one to provide additional features like texture coordinates and vertex
// colors. Custom vertex classes need to provide a `pos` property
// `flipped()`, and `interpolate()` methods that behave analogous to the ones
// FIXME: And a lot MORE (see plane.fromVector3Ds for ex) ! This is fragile code
// defined by `Vertex`.
const Vertex = function (pos) {
    this.pos = pos;
};

// create from an untyped object with identical property names:
Vertex.fromObject = function (obj) {
    var pos = new Vector(obj.pos);
    return new Vertex(pos);
};

Vertex.prototype = {
    // Return a vertex with all orientation-specific data (e.g. vertex normal) flipped. Called when the
    // orientation of a polygon is flipped.
    flipped: function () {
        return this;
    },

    getTag: function () {
        var result = this.tag;
        if (!result) {
            result = window.getTag(); // TODO: KILL THIS!!!
            this.tag = result;
        }
        return result;
    },

    // Create a new vertex between this vertex and `other` by linearly
    // interpolating all properties using a parameter of `t`. Subclasses should
    // override this to interpolate additional properties.
    interpolate: function (other, t) {
        var newpos = this.pos.lerp(other.pos, t);
        return new Vertex(newpos);
    },
};

export default Vertex;
