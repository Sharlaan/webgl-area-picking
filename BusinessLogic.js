/**
 * Controller for business logic
 * Using Dependency Injection to use Models Service props and methods
 */
class BusinessLogic {
  // Injects ThreeJS Models with Dependency Injection
  constructor(modelsInstance) {
    this.state = {
      isSameFace: false,
      previousFaceIndex: undefined,
      // temporarily stores indices of selected face's vertices, for a given control point
      selectedFaces: [], // format: [ [vertexAIndex, vertexBIndex, vertexCIndex], ... ]
    };

    this.modelsInstance = modelsInstance;

    // DOM events listeners
    const canvaGL = this.modelsInstance.container.getElementsByTagName('canvas')[0];
    canvaGL.addEventListener('mousemove', this.onMouseMove, false);
    ['mousedown', 'mouseup'].forEach((type) => canvaGL.addEventListener(type, this.onClick, false));
  }

  // Init selected faces at mount phase (but after model is rendered, hence the .then in app.js)
  initSelectedFaces = () => {
    const Model = this.modelsInstance.scene.getObjectByName('Model');
    this.modelColors = Model.geometry.getAttribute('color');
    const selectionColor = this.modelsInstance.configColors.selection.toArray();
    console.log({
      'Persisted faces': controlPoints.reduce((acc, cp) => acc.concat(cp.faces), []),
    });
    for (let cp of controlPoints) {
      for (let faceVertices of cp.faces) {
        this.setFaceColor(faceVertices, selectionColor);
      }
    }
  };

  onMouseMove = (event) => {
    event.preventDefault();
    const faceEdge = this.modelsInstance.scene.getObjectByName('Face Edge');
    const targetPointer = this.modelsInstance.scene.getObjectByName('Target Pointer');
    const intersectionWithModel = this.modelsInstance.getIntersection(event);
    // Add condition '&& event.ctrlKey' to show pointer and edges only whith Ctrl key down
    // TODO: add a config option for that ?
    if (intersectionWithModel) {
      this.state.isSameFace = intersectionWithModel.faceIndex === this.state.previousFaceIndex;
      !this.state.isSameFace && (this.state.previousFaceIndex = intersectionWithModel.faceIndex);
      !this.state.isSameFace && console.log({ intersectionWithModel });
      this.showTargetPointer(
        targetPointer,
        intersectionWithModel.point,
        intersectionWithModel.face.normal,
      );
      this.highLightEdges(faceEdge, intersectionWithModel.face, intersectionWithModel.object);
      this.toggleSelections(event, intersectionWithModel.face, this.state.isSameFace);
    } else {
      this.state.previousFaceIndex = undefined;
      faceEdge && (faceEdge.visible = false);
      targetPointer && (targetPointer.visible = false);
    }
  };

  onClick = (event) => {
    event.preventDefault();
    const intersectionWithModel = this.modelsInstance.getIntersection(event);
    if (intersectionWithModel) {
      // Prevents camera moving while mouse dragging
      this.modelsInstance.controls.enabled = !event.ctrlKey || event.type === 'mouseup';
      event.type === 'mousedown'
        ? this.toggleSelections(event, intersectionWithModel.face)
        : this.validateSelections(); // @ mouseup
    } else {
      this.state.previousFaceIndex = undefined;
      const faceEdge = this.modelsInstance.scene.getObjectByName('Face Edge');
      faceEdge && (faceEdge.visible = false);
    }
  };

  // Face selection triggers by mousemove event only if current hovered face changed
  toggleSelections = (event, face, isSameFace = false) => {
    if (event.ctrlKey && event.which === 1 && !isSameFace) {
      const { base, selection } = this.modelsInstance.configColors;
      const faceVertices = [face.a, face.b, face.c];
      // const modelColors = intersection.object.geometry.getAttribute('color');

      const foundStep = this.findStepWithFace(faceVertices);
      if (!this.isFaceSelected(faceVertices)) {
        // Selection
        if (!foundStep) {
          this.setFaceColor(faceVertices, selection.toArray());
          this.state.selectedFaces.push(faceVertices); // FIXME: /!\ Take care of duplicates !
        } else console.info(`Ignoring this face since it is already accounted in step.`);
      } else {
        // Deselection
        this.setFaceColor(faceVertices, base.toArray());
        if (!foundStep) {
          this.deleteFromState(faceVertices);
        } else {
          if (foundStep.faces.length === 1) {
            const index2remove = controlPoints.findIndex((cp) => cp.step === foundStep.step);
            controlPoints.splice(index2remove, 1);
          } else {
            const index2remove = foundStep.faces.findIndex((f) =>
              this.isSameFaceVertices(f, faceVertices),
            );
            foundStep.faces.splice(index2remove, 1);
          }
        }
      }
    }
  };

  validateSelections() {
    this.state.selectedFaces.length && this.createControlPoint();
    console.log('BusinessLogic createControlPoint', controlPoints);
    this.modelsInstance.updateDOM();
  }

  deleteFromState(face) {
    const index2remove = this.state.selectedFaces.findIndex((f) =>
      this.isSameFaceVertices(f, face),
    );
    this.state.selectedFaces.splice(index2remove, 1);
  }

  // Saves selected faces, under a new step,
  // 1 step = 1 control point, 1 control point can include multiple faces (at least 1)
  // Beware to not store twice same face index (CPs should not overlap, at exception of vertices on CP's edges)
  // if overlapping occurs, call editControlPoint() to merge faces
  createControlPoint() {
    controlPoints.push({
      step: 'Step ' + controlPoints.length, // TODO: add a prompt so user can set a custom value
      faces: this.state.selectedFaces,
    });
    this.state.selectedFaces = [];
  }

  // Checks if a step already has some faces in common with selected one
  findStepWithFace(face) {
    return controlPoints.find(({ faces }) => faces.some((f) => this.isSameFaceVertices(f, face)));
  }

  setFaceColor(faceVertices, color2apply) {
    // can not use 'Face' with a BufferGeometry,
    // so have to color the 3 vertices representing the "face"
    // dispatches selectionColor.r/g/b to modelColors.x/y/z
    faceVertices.forEach((v) => this.modelColors.setXYZ(v, ...color2apply));
    this.modelColors.needsUpdate = true;
  }

  // colors edges around the hovered face
  highLightEdges(edge, hoveredFace, Model) {
    const edgePosition = edge.geometry.attributes.position;
    const modelPosition = Model.geometry.attributes.position;
    edgePosition.copyAt(0, modelPosition, hoveredFace.a);
    edgePosition.copyAt(1, modelPosition, hoveredFace.b);
    edgePosition.copyAt(2, modelPosition, hoveredFace.c);
    edgePosition.copyAt(3, modelPosition, hoveredFace.a);
    Model.updateMatrix();
    edge.geometry.applyMatrix(Model.matrix);
    edge.visible = true;
  }

  showTargetPointer(targetPointer, point, normal) {
    targetPointer.position.set(0, 0, 0);
    targetPointer.lookAt(normal);
    point.add(normal.multiplyScalar(0.0005)); // adds some coords along the face's normal so the pointer appears slightly above the face
    targetPointer.position.copy(point);
    targetPointer.visible = true;
  }

  getVertexColor(vertexIndex) {
    return new THREE.Color(
      this.modelColors.getX(vertexIndex),
      this.modelColors.getY(vertexIndex),
      this.modelColors.getZ(vertexIndex),
    );
  }

  isSameFaceVertices(face1, face2) {
    return face1.every((v, i) => v === face2[i]);
  }

  isFaceSelected(faceVertices) {
    const selectionColor = this.modelsInstance.configColors.selection.getHexString();
    return faceVertices.every((v) => this.getVertexColor(v).getHexString() === selectionColor);
  }
}
