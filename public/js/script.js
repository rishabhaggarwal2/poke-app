var socket;
var my_id;
var me = {
  id: '',
  pokes: 5,
  size: 5,
};
var my_users = [];
sbVertexShader = [
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
  "  vWorldPosition = worldPosition.xyz;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
  "}"
].join("\n");
sbFragmentShader = [
  "uniform vec3 topColor;",
  "uniform vec3 bottomColor;",
  "uniform float offset;",
  "uniform float exponent;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  float h = normalize( vWorldPosition + offset ).y;",
  "  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( h, exponent ), 0.0 ) ), 1.0 );",
  "}"
].join("\n");

var lesson10 = {
  scene: null,
  camera: null,
  renderer: null,
  container: null,
  controls: null,
  clock: null,
  stats: null,
  plane: null,
  selection: null,
  offset: new THREE.Vector3(),
  objects: [],
  raycaster: new THREE.Raycaster(),
  init: function() {
    // Create main scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcce0ff, 0.0003);
    var SCREEN_WIDTH = window.innerWidth,
      SCREEN_HEIGHT = window.innerHeight;
    // Prepare perspective camera
    var VIEW_ANGLE = 45,
      ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
      NEAR = 1,
      FAR = 1000;
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.scene.add(this.camera);
    this.camera.position.set(100, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    // Prepare webgl renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.renderer.setClearColor(this.scene.fog.color);
    // Prepare container
    this.container = document.createElement("div");
    document.body.appendChild(this.container);
    this.container.appendChild(this.renderer.domElement);
    // Events
    THREEx.WindowResize(this.renderer, this.camera);
    document.addEventListener("mousedown", this.onDocumentMouseDown, false);
    document.addEventListener("mousemove", this.onDocumentMouseMove, false);
    document.addEventListener("mouseup", this.onDocumentMouseUp, false);
    // Prepare Orbit controls
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.target = new THREE.Vector3(0, 0, 0);
    this.controls.maxDistance = 150;
    // Prepare clock
    this.clock = new THREE.Clock();
    // Prepare stats
    // this.stats = new Stats();
    // this.stats.domElement.style.position = "absolute";
    // this.stats.domElement.style.left = "50px";
    // this.stats.domElement.style.bottom = "50px";
    // this.stats.domElement.style.zIndex = 1;
    // this.container.appendChild(this.stats.domElement);
    // Add lights
    this.scene.add(new THREE.AmbientLight(0x444444));
    var dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(200, 200, 1000).normalize();
    this.camera.add(dirLight);
    this.camera.add(dirLight.target);
    // ....
    this.addSkybox();
  },
  addSkybox: function() {
    var iSBrsize = 500;
    var uniforms = {
      topColor: { type: "c", value: new THREE.Color(0x0f2640) },
      bottomColor: { type: "c", value: new THREE.Color(0x000000) },
      offset: { type: "f", value: iSBrsize },
      exponent: { type: "f", value: 1.5 }
    };
    var skyGeo = new THREE.SphereGeometry(iSBrsize, 32, 32);
    skyMat = new THREE.ShaderMaterial({
      vertexShader: sbVertexShader,
      fragmentShader: sbFragmentShader,
      uniforms: uniforms,
      side: THREE.DoubleSide,
      fog: false
    });
    skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);
  },
  onDocumentMouseDown: function(event) {
    // Get mouse position
    var mouseX = event.clientX / window.innerWidth * 2 - 1;
    var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    // Get 3D vector from 3D mouse position using 'unproject' function
    var vector = new THREE.Vector3(mouseX, mouseY, 1);
    vector.unproject(lesson10.camera);
    // Set the raycaster position
    lesson10.raycaster.set(
      lesson10.camera.position,
      vector.sub(lesson10.camera.position).normalize()
    );
    // Find all intersected objects
    var intersects = lesson10.raycaster.intersectObjects(lesson10.objects);
    if (intersects.length > 0) {
      // Disable the controls
      lesson10.controls.enabled = false;
      // Set the selection - first intersected object
      lesson10.selection = intersects[0].object;
      // lesson10.selection.scale.x+=0.5;
      // lesson10.selection.scale.y+=0.5;
      // lesson10.selection.scale.z+=0.5;
      console.log(lesson10.selection.uid);
      if(lesson10.selection.uid != my_id) {
          console.log("poke");
          socket.emit("poke", {poker: my_id, poked:lesson10.selection.uid});
      }
      // Calculate the offset
      var intersects = lesson10.raycaster.intersectObject(lesson10.plane);
      lesson10.offset.copy(intersects[0].point).sub(lesson10.plane.position);
    }
  },
  onDocumentMouseMove: function(event) {
    // ....
  },
  onDocumentMouseUp: function(event) {
    lesson10.controls.enabled = true;
    lesson10.selection = null;
  },
  addObjects: function(users) {
    // Add objects
    // Add 100 random objects (spheres)
    users.forEach(user => {
      //if user doesn't exist in my users
      if(my_users.indexOf(user.id) === -1 && user.alive) {
        //Add user to my users
        my_users.push(user.id);
        //Create new user
        var object, material, radius;
        var objGeometry = new THREE.SphereGeometry(1, 5, 5);
        if(user.id == my_id) {
          material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            flatShading: true,
            emissive: 0x0,
            specular: 0x0,
            shininess: 100
          });
        } else {
          material = new THREE.MeshPhongMaterial({
            color: user.color,
            flatShading: true,
            emissive: 0x0,
            specular: 0x0,
            shininess: 100
          });
        }
        material.transparent = true;
        object = new THREE.Mesh(objGeometry.clone(), material);
        this.objects.push(object);
        radius = 2.5;
        object.scale.x = user.fatness/2;
        object.scale.y = user.fatness/2;
        object.scale.z = user.fatness/2;
        object.position.x = user.x;
        object.position.y = user.y;
        object.position.z = user.z;
        object.uid = user.id;
        object.pokes = user.pokes;
        object.fatness = user.fatness;
        this.scene.add(object);
      }
    });
    console.log(users);
  }
};
// Animate the scene
function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}
// Update controls and stats
function update() {
  var delta = lesson10.clock.getDelta();
  lesson10.controls.update(delta);
  // lesson10.stats.update();
  lesson10.objects.forEach(object => {
    object.rotation.x += 0.01 / object.scale.x;
    object.rotation.y += 0.01 / object.scale.x;
    object.rotation.z += 0.01 / object.scale.x;
    // object.position.x += 0.01 / object.scale.x;
  });
}
// Render the scene
function render() {
  if (lesson10.renderer) {
    lesson10.renderer.render(lesson10.scene, lesson10.camera);
  }
}
// Initialize lesson on page load
function initializeLesson() {
  socket = io();
  lesson10.init();
  my_id = (new Date().toString() + new Date().getMilliseconds().toString()).replace(/\s/g, '');
  socket.on("add user", function(users) {
    console.log("shit");
    lesson10.addObjects(users);
  });
  socket.on("poke", function(users) {
    users.forEach(user => {
        if(user.id == my_id) {
          me.pokes = user.pokes;
          me.fatness = user.fatness;
        }
        if(user.alive) {
          var curr = lesson10.objects.find(elem => elem.uid == user.id);
          curr.scale.x = user.fatness/2;
          curr.scale.y = user.fatness/2;
          curr.scale.z = user.fatness/2;
        } else {
            var currIndex = lesson10.objects.findIndex(elem => elem.uid == user.id);
            lesson10.scene.remove(lesson10.objects[currIndex]);
            lesson10.objects.splice(currIndex, 1);
        }
    });
  });
  socket.emit("connectlol", my_id);
  animate();
}
if (window.addEventListener)
  window.addEventListener("load", initializeLesson, false);
else if (window.attachEvent) window.attachEvent("onload", initializeLesson);
else window.onload = initializeLesson;
