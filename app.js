// interesting sources
// wireframe: https://threejs.org/examples/#webgl_geometry_convex
// wireframe: https://threejs.org/examples/#webgl_lines_fat_wireframe
// https://threejs.org/examples/?q=raycast#webgl_raycast_texture
// https://threejs.org/examples/#webgl_interactive_buffergeometry
// add an object: https://threejs.org/examples/#webgl_interactive_voxelpainter
// precision using nb faces: https://threejs.org/examples/#webgl_modifier_subdivision
// comparison to show defects : https://threejs.org/examples/#webgl_multiple_scenes_comparison
// https://threejs.org/examples/#webgl_nearestneighbour
// Explanations why can not color faces with BufferGeometries:
// https://stackoverflow.com/questions/41670308/three-buffergeometry-how-do-i-manually-set-face-colors#answer-41682130
// Docs BufferAttribute: https://threejs.org/docs/index.html#api/en/core/BufferAttribute
// Color on click: https://stackoverflow.com/questions/50118025/changing-color-of-points-in-a-particle-system-dynamically#answer-50118263
// color multiple faces with dragging mouse: https://jsfiddle.net/Shaggisu/w7ufmutr/9/

const model1 = '96016204_000_light.stl';
const model2 = 'https://threejs.org/examples/models/stl/ascii/slotted_disk.stl';
const props = {
  where: '#model-container',
  modelUrl: model2,
  config: {
    cameraPosition: [-2, 1.8, 3.25],
    BASE_COLOR: 0xff5533,
    SELECTION_COLOR: 'blue',
    iconPath: 'target.png',
    withAxis: true,
    withGrid: true,
  },
  // showPointerAndEdgesHandler: controlProcess.showPointerAndEdges,
  // faceSelectorHandler: controlProcess.toggleSelections,
  // onClick: controlProcess.validateSelections,
};
// stores groups of face's indices (unique and organized in 'steps')
const controlPoints = [
  { step: 'Step 0', faces: [[573, 574, 575]] }, // (faceIndex: 191)
  { step: 'Step 1', faces: [[477, 478, 479], [480, 481, 482], [483, 484, 485], [486, 487, 488]] }, // (faceIndices: 159, 160, 161, 162)
];

if (isWebGLAvailable()) {
  const sceneInstance = new Scene(props);
  const controller = new BusinessLogic(sceneInstance); // Instanciating attaches mouse events listeners to business logics
  sceneInstance
    .renderModel()
    .then(controller.initSelectedFaces)
    .then(sceneInstance.animatedRender);
} else document.body.appendChild(getWebGLErrorMessage());
