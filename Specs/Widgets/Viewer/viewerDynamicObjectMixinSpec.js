/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/viewerDynamicObjectMixin',
         'Core/Cartesian3',
         'DynamicScene/DynamicObject',
         'Scene/CameraFlightPath',
         'DynamicScene/ConstantProperty',
         'Widgets/Viewer/Viewer',
         'Specs/MockDataSource'
     ], function(
         viewerDynamicObjectMixin,
         Cartesian3,
         DynamicObject,
         CameraFlightPath,
         ConstantProperty,
         Viewer,
         MockDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    var viewer;
    beforeEach(function() {
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);
    });

    afterEach(function() {
        if (viewer && !viewer.isDestroyed()) {
            viewer = viewer.destroy();
        }

        document.body.removeChild(container);
    });

    it('adds trackedObject property', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('trackedObject')).toEqual(true);
    });

    it('can get and set trackedObject', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        viewer.trackedObject = undefined;
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('home button resets tracked object', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createAnimation').andReturn({
            duration : 0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('throws with undefined viewer', function() {
        expect(function() {
            viewerDynamicObjectMixin(undefined);
        }).toThrow();
    });

    it('throws if dropTarget property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.trackedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrow();
    });

    it('adds objectTracked event', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('objectTracked')).toEqual(true);
    });

    it('objectTracked is raised by trackObject', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        var spyListener = jasmine.createSpy('listener');
        viewer.objectTracked.addEventListener(spyListener);

        viewer.trackedObject = dynamicObject;

        waitsFor(function() {
            return spyListener.wasCalled;
        });

        runs(function() {
            expect(spyListener).toHaveBeenCalledWith(viewer, dynamicObject);

            viewer.objectTracked.removeEventListener(spyListener);
        });
    });

    it('returns to home when a tracked object is removed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        var beforeDynamicObject = new DynamicObject();
        beforeDynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        preMixinDataSource.dynamicObjectCollection.add(beforeDynamicObject);

        viewer.extend(viewerDynamicObjectMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        postMixinDataSource.dynamicObjectCollection.add(dynamicObject);

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        // spy on the home button's command
        Object.defineProperty(viewer.homeButton.viewModel, 'command', {
            value : jasmine.createSpy('command')
        });

        postMixinDataSource.dynamicObjectCollection.remove(dynamicObject);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();

        // reset the spy before removing the other dynamic object
        viewer.homeButton.viewModel.command.reset();

        viewer.trackedObject = beforeDynamicObject;
        preMixinDataSource.dynamicObjectCollection.remove(beforeDynamicObject);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();
    });

    it('removes data source listeners when destroyed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        viewer.extend(viewerDynamicObjectMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var preMixinListenerCount = preMixinDataSource.dynamicObjectCollection.collectionChanged._listeners.length;
        var postMixinListenerCount = postMixinDataSource.dynamicObjectCollection.collectionChanged._listeners.length;

        viewer = viewer.destroy();

        expect(preMixinDataSource.dynamicObjectCollection.collectionChanged._listeners.length).not.toEqual(preMixinListenerCount);
        expect(postMixinDataSource.dynamicObjectCollection.collectionChanged._listeners.length).not.toEqual(postMixinListenerCount);
    });
}, 'WebGL');