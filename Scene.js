/**
 * ThreeJS Service
 * Note: should always be consumed in one-way : from service into controller
 * @param {object} props configuration parameters used for initialisation
 * @param {string} props.where cssSelector of the html tag housing the 3D container
 * @param {string} props.modelUrl url of the *.stl file
 * @param {object} props.config object defining the parameters used to initialize the 3D components in scene
 */
class Scene {
  constructor({ where, modelUrl, config }) {
    this.state = {
      targetPosition: new THREE.Vector3(),
      rotationMatrix: new THREE.Matrix4(),
      targetRotation: new THREE.Quaternion(),
    };

    this.container = document.querySelector(where);
    this.modelUrl = modelUrl;
    this.config = config;

    this.raycaster = new THREE.Raycaster(); // Raycast (for interactions detection)
    this.mouse = new THREE.Vector2();

    this.configColors = {
      base: new THREE.Color(config.BASE_COLOR),
      selection: new THREE.Color(config.SELECTION_COLOR),
    };

    // Init the DOM
    this.updateDOM();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x72645b);
    this.scene.fog = new THREE.Fog(0x72645b, 2, 15);

    // Axes
    if (this.config.withAxis) {
      const axesHelper = new THREE.AxesHelper();
      axesHelper.name = 'XYZ axis';
      this.scene.add(axesHelper);
    }

    // Grid of size 'size' and divided into 'divisions' segments per side.
    if (this.config.withGrid) {
      const size = 2;
      const divisions = 10;
      const mainColor = 'yellow';
      const gridColor = 'darkGrey';
      const gridHelper = new THREE.GridHelper(size, divisions, mainColor, gridColor);
      gridHelper.name = 'Grid Helper';
      this.scene.add(gridHelper);
    }

    // Ground
    const planeGeometry = new THREE.PlaneBufferGeometry(20, 20);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x999999, specular: 0x101010 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.5;
    plane.receiveShadow = true;
    plane.name = 'Ground';
    this.scene.add(plane);

    // Lights
    const lightHemisphere = new THREE.HemisphereLight(0x443333, 0x111122);
    lightHemisphere.name = 'Light Hemisphere';
    const light1 = this.createShadowedLight(1, 1, 1, 0xffffff, 1.35);
    light1.name = 'Light1';
    // const light2 = this.createShadowedLight(0.5, 1, -1, 0xffaa00, 1);
    // light2.name = 'Light2';
    this.scene.add(lightHemisphere, light1 /*, light2 */);

    // Camera
    const fieldOfView = 35;
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, 1, 15);
    this.camera.position.fromArray(config.cameraPosition);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize sets the canva's width/height
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Stats
    // this.stats = new Stats();
    // this.container.appendChild(this.stats.dom);

    // Mouse controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI / 2; // prevents camera to go underground

    // DOM events listeners
    window.addEventListener('resize', this.onWindowResize, false);
  }

  loadModel(url) {
    const loader = new THREE.STLLoader();
    return new Promise((resolve, reject) => {
      const onLoad = (bufferGeometry) => {
        const size = bufferGeometry.attributes.position.count;
        const colors = [...Array(size)].reduce(
          (acc) => acc.concat(this.configColors.base.toArray()),
          [],
        );
        bufferGeometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        resolve(bufferGeometry);
      };
      // TODO: add <progress/> DOM component
      const onProgress = ({ loaded, total }) =>
        console.info('progress', ((loaded / total) * 100).toFixed(2) + '%');
      const onError = (error) => reject(error);
      loader.load(url, onLoad, onProgress, onError);
    });
  }

  onWindowResize = () => {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  // x, y : mouse positions in global window
  getIntersection = ({ clientX, clientY, offsetX, offsetY, target }) => {
    const { top, left } = target.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    // const x = offsetX; // offsetX/Y works but are experimental
    // const y = offsetY;
    const mouseX = (x / this.renderer.domElement.clientWidth) * 2 - 1;
    const mouseY = -((y / this.renderer.domElement.clientHeight) * 2) + 1;
    this.mouse.set(mouseX, mouseY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const Model = this.scene.getObjectByName('Model');
    return Model && this.raycaster.intersectObject(Model)[0];
  };

  updateDOM() {
    const list = document.getElementsByClassName('list')[0];
    // Clear list
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    // Re-append steps
    controlPoints.forEach((cp) => {
      const li = document.createElement('li');
      li.textContent = cp.step;
      list.appendChild(li);
    });
  }

  createTargetPointer(name, icon) {
    const iconTexture = new THREE.TextureLoader().load(icon);
    const material = new THREE.MeshBasicMaterial({
      map: iconTexture,
      transparent: true,
      color: 0xff0000,
    });
    const geometry = new THREE.PlaneGeometry(0.1, 0.1);
    const targetPointer = new THREE.Mesh(geometry, material);
    targetPointer.name = name;
    targetPointer.visible = false;
    return targetPointer;
  }

  createLine(name) {
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color: 'aqua', transparent: true });
    const line = new THREE.Line(geometry, material);
    line.name = name;
    return line;
  }

  createShadowedLight(x, y, z, color, intensity) {
    const directionalLight = new THREE.DirectionalLight(color, intensity);
    const d = 1;
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.002;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.far = 4;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.position.set(x, y, z);
    return directionalLight;
  }

  async renderModel() {
    try {
      const modelGeometry = await this.loadModel(this.modelUrl);
      console.info('Geometry loaded !', modelGeometry);

      // Material
      const modelMaterial = new THREE.MeshPhongMaterial({
        specular: 0x111111,
        shininess: 200,
        vertexColors: THREE.VertexColors,
      });

      // Mesh
      const model = new THREE.Mesh(modelGeometry, modelMaterial);
      model.castShadow = true;
      model.receiveShadow = true;
      model.name = 'Model';
      this.scene.add(model);

      // Image showing mouse psoition
      const targetPointer = this.createTargetPointer('Target Pointer', this.config.iconPath);
      this.scene.add(targetPointer);

      // Line used to highlight an hovered face
      const edge = this.createLine('Face Edge');
      this.scene.add(edge);
    } catch (error) {
      throw new Error(`Loading the inputted STL file failed ! ${error}`);
    }
  }

  // x, y, z: coords of point to rotate towards
  rotateModel(x, y, z) {
    const Model = this.scene.getObjectByName('Model');
    this.state.targetPosition = new THREE.Vector3(x, y, z);
    this.state.rotationMatrix.lookAt(this.state.targetPosition, Model.position, Model.up);
    this.state.targetRotation.setFromRotationMatrix(this.state.rotationMatrix);
    this.animateRotation();
  }

  animateRotation = () => {
    const Model = this.scene.getObjectByName('Model');
    const SPEED = this.config.rotationSpeed;
    const step = SPEED; // TODO: replace this method with an easing function
    Model.quaternion.rotateTowards(this.state.targetRotation, step);
    !Model.quaternion.equals(this.state.targetRotation) &&
      requestAnimationFrame(this.animateRotation);
  };

  animatedRender = () => {
    requestAnimationFrame(this.animatedRender);
    // this.stats.update(); // shows a FPS-meter
    this.renderer.render(this.scene, this.camera);
  };
}
