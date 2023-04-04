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
        
        this.valid_extensions = [ 'fbx', 'glb', 'gltf' ];
        this.dropEnable = true;
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
        
        const canvas = this.renderer.domElement;
        document.body.appendChild( canvas );

        // Set up camera
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 100 );
        this.camera.position.set( 0, 1.6, 1 );
        
        this.controls = new OrbitControls( this.camera, canvas );
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 10;
        this.controls.target = new THREE.Vector3( 0, 1.3, 0 );
        this.controls.update();
        
        // Set up lights
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0x555555, 0.2 );
        hemiLight.position.set( 0, 20, 0 );
        this.scene.add( hemiLight );

        let dirLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
        dirLight.position.set( 0, 3, 4 );
        dirLight.castShadow = false;
        this.scene.add(dirLight);

        // Add text information
        let info = document.createElement('div');
        info.innerHTML = "Drop your files on screen";
        let icon = document.createElement('i');
        icon.innerHTML = "<i class='bi bi-arrow-down-square'></i>"
        let info2 = document.createElement('div');
        info2.innerHTML = "Supported files: [ " + this.valid_extensions + " ]";
        this.info3 = document.createElement('div');
        
        info.style.fontFamily = info2.style.fontFamily = this.info3.style.fontFamily = "sans-serif";
        info.style.color = info2.style.color = this.info3.style.color = icon.style.color = "white";
        info.style.position = info2.style.position = this.info3.style.position = icon.style.position = 'absolute';
        info.style.top = icon.style.top = 30 + 'px';
        info.style.left = info2.style.left = this.info3.style.left = 40 + 'px';
        icon.style.left = 225 + 'px';
        info2.style.top = 55 + 'px';
        this.info3.style.top = 75 + 'px';
        info2.style.fontSize = this.info3.style.fontSize = "small";

        document.body.appendChild(info);
        document.body.appendChild(icon);
        document.body.appendChild(info2);
        document.body.appendChild(this.info3);

        // Set listeners and events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        canvas.ondragover = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        canvas.ondragend = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        canvas.ondrop = (e) => this.onDrop(e);

        let loadModal = document.getElementById("loading");
        loadModal.ondrop = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        loadModal.ondragover = (e) => {e.preventDefault(); e.stopPropagation(); return false;};
        loadModal.ondragend = (e) => {e.preventDefault(); e.stopPropagation(); return false;};

        // init gui functions
        this.options = {};

        // Start loop
        this.animate();
    }

    deinit() {

        if (this.model)
            this.scene.remove(this.model);

        if (this.gui)
           this.gui.destroy();

        this.fileOptions = {};
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

        // Block multiple loads at the same time
        event.preventDefault();
        event.stopPropagation();

        if (!this.dropEnable)
            return false;
            
        this.dropEnable = false;
        this.deinit(); // clean previous things

        const files = event.dataTransfer.files;

        if (!files.length)
            return;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let name = file.name;
            let tokens = name.split(".");
            let extension = tokens[tokens.length-1].toLowerCase();
            
            if (this.valid_extensions.lastIndexOf(extension) < 0) {
                alert("Invalid file extension. The supported extensions are [" + this.valid_extensions + "]. The input extension was '" + extension + "'");
                return;
            }

            this.info3.innerHTML = "Loaded file: " + file.name;
            document.querySelector("#loading").style.display = 'flex';

            let reader = new FileReader();
            reader.onload = (event) => {
                if (extension == 'fbx') {
                    this.loaderFBX.load( event.target.result, (fbx) => {
                        this.gui = new GUI().title('Assets Information'); // TODO: revise that it resets at every load
                        fbx.scale.set(0.01, 0.01, 0.01); // conversion from centimeters to meters (in glb is not needed because when blender converts from fbx to glb scales from cm to m)

                        fbx.traverse( (obj) => {
                            if (obj.isMesh || obj.isSkinnedMesh) {
                                let folder = this.gui.addFolder(obj.name)
                                folder.style.backgroundColor = "darkslateblue";

                                if (obj.morphTargetDictionary) {
                                    let morphFold = folder.addFolder("Morpher");
                                    morphFold.add(this.options, 'setZero').name('Set all Zero');
                                    for (let blendshape in obj.morphTargetDictionary) {
                                        let idx = obj.morphTargetDictionary[blendshape];
                                        this.fileOptions[blendshape] = 0; // init ...
                                        morphFold.add( this.fileOptions, blendshape, 0, 1 ).onChange( function(morphTargetInfluences, idx, value) {
                                            morphTargetInfluences[idx] = value;
                                        }.bind(this, obj.morphTargetInfluences, idx) );
                                    }
                                    morphFold.close();
                                }
                                
                                if (obj.material) {
                                    let material = obj.material;
                                    let matFold = folder.addFolder(material.name + " [ " + material.type + " ]");
                                    if (!!material.map) matFold.add({show: this.options.show.bind(this, 1)}, 'show').name('Albedo Tex');
                                    if (!!material.aoMap) matFold.add(this.options, 'show').name('Ambient Occlussion Tex');
                                    if (!!material.bumpMap) matFold.add(this.options, 'show').name('Bump Tex');
                                    if (!!material.displacementMap) matFold.add(this.options, 'show').name('Displacement Tex');
                                    if (!!material.emissiveMap) matFold.add(this.options, 'show').name('Emissive Tex');
                                    if (!!material.normalMap) matFold.add(this.options, 'show').name('Normal Tex');
                                    if (!!material.specularMap) matFold.add(this.options, 'show').name('Specular Tex');
                                    if (!!material.alphaMap) matFold.add(this.options, 'show').name('Transparency Tex');
                                    matFold.close();
                                }

                                if (obj.name == "Cornea") {
                                    obj.visible = false;
                                }
                                
                                // ...
                                obj.castShadow = true;
                                obj.receiveShadow = true;
                                
                                folder.close();
                            }
                        } );

                        this.model = fbx;
                        this.scene.add(this.model);
                        this.dropEnable = true;
                        document.querySelector("#loading").style.display = 'none';
                    });
                } 
                else if (extension == 'glb' || extension == 'gltf') { 
                    this.loaderGLB.load( event.target.result, (glb) => {
                        this.gui = new GUI().title('Assets Information'); // TODO: revise that it resets at every load
                        this.gui.domElement.style.backgroundColor = "rgb(40, 40, 40)";
                        this.model = glb.scene;

                        // read textures url
                        let textures = [];
                        const parser = glb.parser;
                        const bufferPromises = parser.json.images.map((imageDef) => {
                            return parser.getDependency('bufferView', imageDef.bufferView);
                        });
                        Promise.all(bufferPromises).then( (buffers => {  
                            for (i = 0; i < buffers.length; i++) {
                                let arrayBufferView = new Uint8Array( buffers[i] );
                                let blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
                                let urlCreator = window.URL || window.webkitURL;
                                let imageUrl = urlCreator.createObjectURL( blob );
                                let sourceID = parser.json.textures[i].source;
                                let id = '';
                                for (let [key, value] of parser.associations) {
                                    if (typeof value.textures !== "undefined") {
                                        if (value.textures == sourceID) {
                                            id = key.uuid;
                                            break;
                                        }
                                    }
                                }

                                // !!! check this texture, is strange !!!
                                // if (parser.json.images[i].name == "Image") {
                                //     window.open(imageUrl,'Image','width=700, height=700, resizable=1');
                                // }

                                textures.push({imageName: parser.json.images[i].name, texID: id, src: imageUrl});
                            }
                        }) );


                        this.model.traverse( (obj) => {
                            if (obj.isMesh || obj.isSkinnedMesh) {
                                let folder = this.gui.addFolder(obj.name);
                                folder.$title.style.backgroundColor = "rgb(31, 31, 31)";
                                folder.domElement.style.backgroundColor = "rgb(40, 40 ,40)";
                                
                                folder.add({ visible: true },'visible').name('Visible').listen().onChange( (value) => {
                                    obj.visible = value;
                                } );

                                if (obj.morphTargetDictionary) {
                                    let morphFold = folder.addFolder("Morpher");
                                    morphFold.add({setZero: this.setZero.bind(this, obj.morphTargetInfluences)}, 'setZero').name('Set all Zero');
                                    morphFold.domElement.style.backgroundColor = "rgb(40, 40, 40)";
                                    for (let blendshape in obj.morphTargetDictionary) {
                                        let idx = obj.morphTargetDictionary[blendshape];
                                        this.fileOptions[blendshape] = obj.morphTargetInfluences[idx]; // init ...
                                        morphFold.add( this.fileOptions, blendshape, 0, 1 ).listen().onChange( (value) => {
                                                obj.morphTargetInfluences[idx] = value;
                                        } );
                                        // morphFold.add( this.fileOptions, blendshape, 0, 1 ).onChange( function(morphTargetInfluences, idx, value) {
                                        //     morphTargetInfluences[idx] = value;
                                        // }.bind(this, obj.morphTargetInfluences, idx) );
                                    }
                                    morphFold.close();
                                }
                                
                                if (obj.material) {
                                    let material = obj.material;
                                    material.side = THREE.DoubleSide;
                                    let matFold = folder.addFolder(material.name + " [ " + material.type + " ]");
                                    matFold.domElement.style.backgroundColor = "rgb(40 40 40)";
                                    if (!!material.map) matFold.add({show: this.show.bind(this, textures, material.map.uuid)}, 'show').name('Albedo Texture');
                                    if (!!material.aoMap) matFold.add({show: this.show.bind(this, textures, material.aoMap.uuid)}, 'show').name('Ambient Occlussion Texture');
                                    if (!!material.normalMap) matFold.add({show: this.show.bind(this, textures, material.normalMap.uuid)}, 'show').name('Normal Texture');
                                    if (!!material.specularIntensityMap) matFold.add({show: this.show.bind(this, textures, material.specularIntensityMap.uuid)}, 'show').name('Specular Texture');
                                    if (!!material.emissiveMap) matFold.add({show: this.show.bind(this, textures, material.emissiveMap.uuid)}, 'show').name('Emissive Texture');
                                    // alpha is included in the base color texture as the 4th channel
                                    if (!!material.alphaMap) matFold.add({show: this.show.bind(this, textures, material.alphaMap.uuid)}, 'show').name('Alpha Texture');
                                    // roughness and metalness are combined in one texture: RGBA - (1, roughness, metalness, 1)
                                    if (!!material.roughnessMap) matFold.add({show: this.show.bind(this, textures, material.roughnessMap.uuid)}, 'show').name('Roughness Texture');
                                    if (!!material.metalnessMap) matFold.add({show: this.show.bind(this, textures, material.metalnessMap.uuid)}, 'show').name('Metalness Texture');

                                    if (!!material.bumpMap) matFold.add({show: this.show.bind(this, textures, material.bumpMap.uuid)}, 'show').name('Bump Texture');
                                    if (!!material.displacementMap) matFold.add({show: this.show.bind(this, textures, material.displacementMap.uuid)}, 'show').name('Displacement Texture');
                                    matFold.close();
                                }
                                
                                // ...
                                obj.castShadow = true;
                                obj.receiveShadow = true;
                                
                                folder.close();
                            }
                        } );

                        this.scene.add(this.model);
                        this.dropEnable = true;
                        document.querySelector("#loading").style.display = 'none';
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    }

    show ( texList, texID ) {
        for (let i = 0; i < texList.length; i++) {
            if (texID == texList[i].texID) {
                //let handlerWindow = window.open(texList[i].src,'Image','width=700,height=700,resizable=1');
                let handlerWindow = window.open('','Image','width=700,height=700,resizable=1');
                if (handlerWindow.document.body.firstChild) handlerWindow.document.body.removeChild(handlerWindow.document.body.firstChild);
                handlerWindow.document.write('<img style="display:block; -webkit-user-select:none; cursor:zoom-in; margin:auto; max-width:100%; max-height:100vh; margin:auto;" src="' + texList[i].src + '"></img>');
                handlerWindow.document.body.getElementsByTagName('img')[0].style.backgroundImage = "url('../empty.jpg')";
                handlerWindow.document.body.getElementsByTagName('img')[0].style.backgroundRepeat = "no-repeat";
                handlerWindow.document.body.getElementsByTagName('img')[0].style.backgroundSize = "cover";
                handlerWindow.document.body.style.backgroundColor = "rgb(0,0,0)";
                handlerWindow.document.body.style.overflow = "hidden";
                handlerWindow.document.body.style.display = "grid";
                handlerWindow.document.body.style.height = "100%";
                return;
            }
        }
    }
    
    setZero ( morphTargetInfluences ) {
        for (let val = 0; val < morphTargetInfluences.length; val++) { 
            morphTargetInfluences[val] = 0;
        }
        for (let blendshape in this.fileOptions) {
            this.fileOptions[blendshape] = 0;
        }
        return;
    }
}

let app = new App();
app.init();

export { app };