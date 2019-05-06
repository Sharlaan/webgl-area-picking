const model1 = '96016204_000_light.stl';
const model2 = 'https://threejs.org/examples/models/stl/ascii/slotted_disk.stl';
const props = {
  where: '#model-container',
  modelUrl: model2,
  config: {
    cameraPosition: [-2, 2, 3],
    rotationSpeed: 0.075, // rotation speed for PoV changes
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
    .then(controller.initModelAndCameraEventListeners)
    .then(sceneInstance.animatedRender); // Must always be in the last call
} else document.body.appendChild(getWebGLErrorMessage());
