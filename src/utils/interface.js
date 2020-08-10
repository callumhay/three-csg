import * as THREE from 'three';
import { Vector, Vertex, Polygon } from '../math/index';
import { CSG as _CSG } from '../core/index';

/*
 * interface converters
 */
const importThreeGeometry = (geometry) => {
    if (geometry instanceof _CSG) return geometry;

    const csg = new _CSG();
    const vertices = geometry.index ? geometry.index.array : [];
    const vectors = geometry.attributes.position.array;
    const getVector = (x, y = 0) => vectors[vertices[x] * 3 + y];
    const getVertex = (x) => new Vertex(new Vector(getVector(x), getVector(x, 1), getVector(x, 2)));
    const getVertex2 = (x) => new Vertex(new Vector(vectors[x], vectors[x + 1], vectors[x + 2]));
    const getVertexes = (x) => [getVertex(x), getVertex(x + 1), getVertex(x + 2)];

    if (vertices.length) {
        for (let x = 0; x < vertices.length; x += 3) {
            csg.polygons.push(new Polygon(getVertexes(x)));
        }
    } else {
        for (let x = 0; x < vectors.length; x += 9) {
            csg.polygons.push(new Polygon([getVertex2(x), getVertex2(x + 3), getVertex2(x + 6)]));
        }
    }

    csg.isCanonicalized = false;
    csg.isRetesselated = false;
    return csg;
};

const exportThreeGeometry = (geometry, smoothingAngle=40*Math.PI/180) => {
  if (!(geometry instanceof CSG)) return geometry;

  const threeGeometry = new THREE.BufferGeometry(); // eslint-disable-line no-undef
  const vertices = [];
  const normalVecs = [];
  const colors = [];
  let colorsUsed = false;
  let vertexColor;

  const VERTEX_PRECISION = 4;
  const vertexMap = {};
  const faces = [];

  geometry.polygons.forEach((polygon) => {
    const normal = polygon.plane.normal;
    const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);

    if (polygon.shared.color) {
      vertexColor = [polygon.shared.color[0], polygon.shared.color[1], polygon.shared.color[2]];
      colorsUsed = true;
    } else {
      vertexColor = [1, 1, 1];
    }
    const threeColor = new THREE.Color(vertexColor[0], vertexColor[1], vertexColor[2]);

    for (let x = 0; x < polygon.vertices.length - 2; x++) {
      const face = [0,0,0];
      faces.push(face);
      [0, x + 1, x + 2].forEach((vertIdx, idx) => {
        const vertex = polygon.vertices[vertIdx].pos;
        const hash = vertex.x.toFixed(VERTEX_PRECISION) + "_" + vertex.y.toFixed(VERTEX_PRECISION) + "_" + vertex.z.toFixed(VERTEX_PRECISION);
        let vertexLookup = vertexMap[hash];

        if (vertexLookup) {
          vertexLookup.normals.push(normalVec);
          vertexLookup.colours.push(threeColor);
          vertexLookup.faces.push([face,idx]);
        }
        else {
          vertexLookup = vertexMap[hash] = {vertex: vertex, colours: [threeColor], normals: [normalVec], faces: [[face,idx]]};
        }
      });
    }
  });

  // Go over the vertex map and clean up any duplicate vertices based on a normal angle
  Object.values(vertexMap).forEach(vertexObj => {
    const {vertex, normals, colours, faces} = vertexObj;

    const ungroupedNormals = normals.map(() => true);
    const groupedNormals = [];

    for (let i = 0; i < normals.length; i++) {
      if (ungroupedNormals[i]) {
        const currGroup = [i];
        ungroupedNormals[i] = false;

        for (let j = i; j < normals.length; j++) {
          if (ungroupedNormals[j]) {
            const iNorm = normals[i];
            const jNorm = normals[j];
            if (iNorm.angleTo(jNorm) <= smoothingAngle) {
              currGroup.push(j);
              ungroupedNormals[j] = false;
            }
          }
        }

        groupedNormals.push(currGroup);
      }
    }

    // Go through each of the grouped normals, average each group and insert them as duplicates of the vertices
    for (let i = 0; i < groupedNormals.length; i++) {
      const currNormalIndices = groupedNormals[i];

      const avgNormal = new THREE.Vector3();
      for (let j = 0; j < currNormalIndices.length; j++) {
        const currNormal = normals[currNormalIndices[j]];
        avgNormal.add(currNormal);
      }
      avgNormal.normalize();

      for (let j = 0; j < currNormalIndices.length; j++) {
        const currIndex = currNormalIndices[j];
        const currColour = colours[currIndex];
        const [face, idx] = faces[currIndex];

        face[idx] = Math.floor(vertices.length/3);

        ['x', 'y', 'z'].forEach((axis) => {
          vertices.push(vertex[axis]);
          normalVecs.push(avgNormal[axis]);
        });
        ['r', 'g', 'b'].forEach((component) => {
          colors.push(currColour[component]);
        });
      }

    }
  });

  const indices = new Array(faces.length*3);
  let indexCount = 0;
  faces.forEach(face => {
    indices[indexCount++] = face[0];
    indices[indexCount++] = face[1];
    indices[indexCount++] = face[2];
  });

  threeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3)); // eslint-disable-line no-undef
  threeGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalVecs), 3, true));
  if (colorsUsed) threeGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3)); // eslint-disable-line no-undef
  threeGeometry.setIndex(indices);

  return threeGeometry;
};

/*
 * operations
 */
const prepareObjects = (objects, colors) =>
    objects.map((object, index) => {
        const convertedObject = importThreeGeometry(object);

        if (colors[index]) convertedObject.setColor([colors[index].r, colors[index].g, colors[index].b, 1]);

        return convertedObject;
    });

const runOperation = (operation, objects, colors = []) => {
    objects = prepareObjects(objects, colors);

    const firstObject = objects.shift();

    return firstObject[operation](objects);
};

export { exportThreeGeometry, runOperation };
