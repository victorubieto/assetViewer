import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

class App {

    constructor() {
        
        this.clock = new THREE.Clock();
        this.loaderFBX = new FBXLoader();
        this.loaderGLB = new GLTFLoader();

        // main render attributes
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        
        this.options = {};
    }

    init() {

        // Init scene, renderer and add to body element
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x2c2c2c );
        this.scene.add( new THREE.GridHelper(10, 10) );
        
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaInput = true; // applies degamma to textures ( not applied to material.color and roughness, metalnes, etc. Only to colour textures )
        this.renderer.gammaOutput = true; // applies gamma after all lighting operations ( which are done in linear space )
        
        const canvas = this.renderer.domElement;
        document.body.appendChild( canvas );

        // Set up camera
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 100 );
        this.camera.position.set( 0, 2, 3 );
        
        this.controls = new OrbitControls( this.camera, canvas );
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 10;
        this.controls.target = new THREE.Vector3( 0, 0.5, 0 );
        this.controls.update();
        
        // Set up lights
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0x555555, 0.2 );
        hemiLight.position.set( 0, 20, 0 );
        this.scene.add( hemiLight );

        let dirLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
        dirLight.position.set( 0, 3, 4 );
        dirLight.castShadow = false;
        this.scene.add(dirLight);

        // TODO (?)

        // Set listeners and events
        window.addEventListener( 'resize', this.onWindowResize.bind(this) );
        canvas.ondragover = () => {return false};
        canvas.ondragend = () => {return false};
        canvas.ondrop = (e) => this.onDrop(e);
        
        // Start loop
        this.animate();
    }

    deinit() {

        if (this.model)
            this.scene.remove(this.model);

        if (this.gui)
           this.gui.destroy();

        this.options = {};
    }

    animate() {

        requestAnimationFrame( this.animate.bind(this) );

        const delta = this.clock.getDelta();

        if ( this.mixer ) {
            this.mixer.update( delta );
        } 

        this.renderer.render( this.scene, this.camera );
    }
    
    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    onDrop( event ) {

        this.deinit(); // clean previous things
        document.querySelector("#loading").style.display = 'flex';

        event.preventDefault();
        event.stopPropagation();

        const files = event.dataTransfer.files;

        if (!files.length)
            return;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let name = file.name;
            let tokens = name.split(".");
            let extension = tokens[tokens.length-1].toLowerCase();
            let valid_extensions = [ 'fbx', 'glb', 'gltf' ];
            
            if (valid_extensions.lastIndexOf(extension) < 0) {
                alert("Invalid file extension. The supported extensions are [" + valid_extensions + "]. The input extension was '" + extension + "'");
                return;
            }

            let reader = new FileReader();
            reader.onload = (event) => {
                if (extension == 'fbx') {
                    this.loaderFBX.load( event.target.result, (fbx) => {
                        this.gui = new GUI().title('Assets Information'); // TODO: revise that it resets at every load
                        fbx.scale.set(0.01, 0.01, 0.01); // conversion from centimeters to meters (blender glb is in cm, but our application works in m)

                        fbx.traverse( (obj) => {
                            if (obj.isMesh || obj.isSkinnedMesh) {
                                let folder = this.gui.addFolder(obj.name);
                                if (obj.morphTargetDictionary) {
                                    for (let blendshape in obj.morphTargetDictionary) {
                                        let idx = obj.morphTargetDictionary[blendshape];
                                        blendshape = blendshape.split(".")[1];
                                        this.options[blendshape] = 0; // init ...
                                        folder.add( this.options, blendshape, 0, 1 ).onChange( function( morphTargetInfluences, idx, value ) {
                                            morphTargetInfluences[idx] = value;
                                        }.bind(this, obj.morphTargetInfluences, idx) );
                                    }
                                }
                                else {
                                    folder.close();
                                }

                                obj.castShadow = true;
                                obj.receiveShadow = true;
                            }

                        } );

                        this.model = fbx;
                        this.scene.add(this.model);
                        document.querySelector("#loading").style.display = 'none';
                    });
                } 
                else if (extension == 'glb' || extension == 'gltf') { 
                    this.loaderGLB.load( event.target.result, (glb) => {
                        this.gui = new GUI().title('Assets Information'); // TODO: revise that it resets at every load
                        this.model = glb.scene;
                        this.model.scale.set(0.01, 0.01, 0.01); // conversion from centimeters to meters (blender glb is in cm, but our application works in m)

                        this.model.traverse( (obj) => {
                            if (obj.isMesh || obj.isSkinnedMesh) {
                                let folder = this.gui.addFolder(obj.name);
                                if (obj.morphTargetDictionary) {
                                    for (let blendshape in obj.morphTargetDictionary) {
                                        let idx = obj.morphTargetDictionary[blendshape];
                                        blendshape = blendshape.split(".")[1];
                                        this.options[blendshape] = 0; // init ...
                                        folder.add( this.options, blendshape, 0, 1 ).onChange( function( morphTargetInfluences, idx, value ) {
                                            morphTargetInfluences[idx] = value;
                                        }.bind(this, obj.morphTargetInfluences, idx) );
                                    }
                                }
                                else {
                                    folder.close();
                                }
                                obj.castShadow = true;
                                obj.receiveShadow = true;
                            }

                        } );

                        this.scene.add(this.model);
                        document.querySelector("#loading").style.display = 'none';
                    });
                }
            };
            reader.readAsDataURL(file);

            
        }
    }
}

let app = new App();
app.init();

export { app };