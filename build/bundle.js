
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.44.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p0;
    	let t5;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let p1;
    	let t8;
    	let h50;
    	let t10;
    	let img1;
    	let img1_src_value;
    	let t11;
    	let br0;
    	let t12;
    	let img2;
    	let img2_src_value;
    	let t13;
    	let br1;
    	let t14;
    	let img3;
    	let img3_src_value;
    	let t15;
    	let br2;
    	let t16;
    	let img4;
    	let img4_src_value;
    	let t17;
    	let br3;
    	let t18;
    	let img5;
    	let img5_src_value;
    	let t19;
    	let br4;
    	let t20;
    	let img6;
    	let img6_src_value;
    	let t21;
    	let br5;
    	let t22;
    	let img7;
    	let img7_src_value;
    	let t23;
    	let br6;
    	let t24;
    	let img8;
    	let img8_src_value;
    	let t25;
    	let br7;
    	let t26;
    	let img9;
    	let img9_src_value;
    	let t27;
    	let br8;
    	let t28;
    	let p2;
    	let t30;
    	let h51;
    	let t32;
    	let img10;
    	let img10_src_value;
    	let t33;
    	let br9;
    	let t34;
    	let img11;
    	let img11_src_value;
    	let t35;
    	let br10;
    	let t36;
    	let img12;
    	let img12_src_value;
    	let t37;
    	let br11;
    	let t38;
    	let img13;
    	let img13_src_value;
    	let t39;
    	let br12;
    	let t40;
    	let img14;
    	let img14_src_value;
    	let t41;
    	let br13;
    	let t42;
    	let img15;
    	let img15_src_value;
    	let t43;
    	let br14;
    	let t44;
    	let img16;
    	let img16_src_value;
    	let t45;
    	let br15;
    	let t46;
    	let img17;
    	let img17_src_value;
    	let t47;
    	let br16;
    	let t48;
    	let img18;
    	let img18_src_value;
    	let t49;
    	let br17;
    	let t50;
    	let img19;
    	let img19_src_value;
    	let t51;
    	let br18;
    	let t52;
    	let img20;
    	let img20_src_value;
    	let t53;
    	let br19;
    	let t54;
    	let img21;
    	let img21_src_value;
    	let t55;
    	let br20;
    	let t56;
    	let p3;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "I, Peerada Promnart, nicknamed \"Nest\", Nest that is not Nescafe or Nestle ice cream. but nest which means bird's nest As for my real name, Peerada means brave. Sometimes the word brave and the word reckless have only a thin line between them. And being a fire-elemental person who likes to do things with speed, speak fast, act fast and think fast. But whether it will succeed or not is another matter.";
    			t5 = space();
    			img0 = element("img");
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "But the subject I'm most proud of in life is probably riding a horse and drawing. I first learned about horseback riding from my father's desire to ride horses as a child. Because my father wanted me to try a lot of different things in order to know what I like and what I don't like. In the end, I was quite fond of horseback riding. Riding is now almost a part of my life because riding is what I spend the most time with from morning till evening.";
    			t8 = space();
    			h50 = element("h5");
    			h50.textContent = "horse riding figure";
    			t10 = space();
    			img1 = element("img");
    			t11 = space();
    			br0 = element("br");
    			t12 = space();
    			img2 = element("img");
    			t13 = space();
    			br1 = element("br");
    			t14 = space();
    			img3 = element("img");
    			t15 = space();
    			br2 = element("br");
    			t16 = space();
    			img4 = element("img");
    			t17 = space();
    			br3 = element("br");
    			t18 = space();
    			img5 = element("img");
    			t19 = space();
    			br4 = element("br");
    			t20 = space();
    			img6 = element("img");
    			t21 = space();
    			br5 = element("br");
    			t22 = space();
    			img7 = element("img");
    			t23 = space();
    			br6 = element("br");
    			t24 = space();
    			img8 = element("img");
    			t25 = space();
    			br7 = element("br");
    			t26 = space();
    			img9 = element("img");
    			t27 = space();
    			br8 = element("br");
    			t28 = space();
    			p2 = element("p");
    			p2.textContent = "As for art preferences In fact, it was caused by the desire to draw beautiful pictures like friends. So I tried to practice from dislike to like until today. And here are some of the artworks I've done.";
    			t30 = space();
    			h51 = element("h5");
    			h51.textContent = "figure art";
    			t32 = space();
    			img10 = element("img");
    			t33 = space();
    			br9 = element("br");
    			t34 = space();
    			img11 = element("img");
    			t35 = space();
    			br10 = element("br");
    			t36 = space();
    			img12 = element("img");
    			t37 = space();
    			br11 = element("br");
    			t38 = space();
    			img13 = element("img");
    			t39 = space();
    			br12 = element("br");
    			t40 = space();
    			img14 = element("img");
    			t41 = space();
    			br13 = element("br");
    			t42 = space();
    			img15 = element("img");
    			t43 = space();
    			br14 = element("br");
    			t44 = space();
    			img16 = element("img");
    			t45 = space();
    			br15 = element("br");
    			t46 = space();
    			img17 = element("img");
    			t47 = space();
    			br16 = element("br");
    			t48 = space();
    			img18 = element("img");
    			t49 = space();
    			br17 = element("br");
    			t50 = space();
    			img19 = element("img");
    			t51 = space();
    			br18 = element("br");
    			t52 = space();
    			img20 = element("img");
    			t53 = space();
    			br19 = element("br");
    			t54 = space();
    			img21 = element("img");
    			t55 = space();
    			br20 = element("br");
    			t56 = space();
    			p3 = element("p");
    			p3.textContent = "Finally, riding a horse has given me a lot of improvement. Both physically and mentally And I'm happy every time I ride a horse.";
    			attr_dev(h1, "class", "svelte-19ocjkw");
    			add_location(h1, file, 7, 1, 96);
    			add_location(p0, file, 8, 1, 120);
    			if (!src_url_equal(img0.src, img0_src_value = "image/N.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "width", "800");
    			add_location(img0, file, 9, 1, 531);
    			add_location(p1, file, 10, 1, 576);
    			add_location(h50, file, 11, 1, 1035);
    			if (!src_url_equal(img1.src, img1_src_value = "image/hores/im8.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "width", "600");
    			add_location(img1, file, 12, 1, 1065);
    			add_location(br0, file, 12, 53, 1117);
    			if (!src_url_equal(img2.src, img2_src_value = "image/hores/im7.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			attr_dev(img2, "width", "600");
    			add_location(img2, file, 13, 1, 1123);
    			add_location(br1, file, 13, 53, 1175);
    			if (!src_url_equal(img3.src, img3_src_value = "image/hores/im5.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			attr_dev(img3, "width", "600");
    			add_location(img3, file, 14, 1, 1181);
    			add_location(br2, file, 14, 53, 1233);
    			if (!src_url_equal(img4.src, img4_src_value = "image/hores/im4.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "width", "600");
    			add_location(img4, file, 15, 1, 1239);
    			add_location(br3, file, 15, 53, 1291);
    			if (!src_url_equal(img5.src, img5_src_value = "image/hores/im3.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			attr_dev(img5, "width", "600");
    			add_location(img5, file, 16, 1, 1297);
    			add_location(br4, file, 16, 53, 1349);
    			if (!src_url_equal(img6.src, img6_src_value = "image/hores/im1.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			attr_dev(img6, "width", "600");
    			add_location(img6, file, 17, 1, 1355);
    			add_location(br5, file, 17, 53, 1407);
    			if (!src_url_equal(img7.src, img7_src_value = "image/hores/im6.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			attr_dev(img7, "width", "600");
    			add_location(img7, file, 18, 1, 1413);
    			add_location(br6, file, 18, 53, 1465);
    			if (!src_url_equal(img8.src, img8_src_value = "image/hores/im1.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			attr_dev(img8, "width", "600");
    			add_location(img8, file, 19, 1, 1471);
    			add_location(br7, file, 19, 53, 1523);
    			if (!src_url_equal(img9.src, img9_src_value = "image/hores/im2.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			attr_dev(img9, "width", "600");
    			add_location(img9, file, 20, 1, 1529);
    			add_location(br8, file, 20, 53, 1581);
    			add_location(p2, file, 21, 1, 1587);
    			add_location(h51, file, 22, 1, 1798);
    			if (!src_url_equal(img10.src, img10_src_value = "image/art/1.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "");
    			attr_dev(img10, "width", "600");
    			add_location(img10, file, 23, 1, 1819);
    			add_location(br9, file, 23, 49, 1867);
    			if (!src_url_equal(img11.src, img11_src_value = "image/art/4.jpg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			attr_dev(img11, "width", "600");
    			add_location(img11, file, 24, 1, 1873);
    			add_location(br10, file, 24, 49, 1921);
    			if (!src_url_equal(img12.src, img12_src_value = "image/art/8.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			attr_dev(img12, "width", "600");
    			add_location(img12, file, 25, 1, 1927);
    			add_location(br11, file, 25, 49, 1975);
    			if (!src_url_equal(img13.src, img13_src_value = "image/art/9.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "alt", "");
    			attr_dev(img13, "width", "600");
    			add_location(img13, file, 26, 1, 1981);
    			add_location(br12, file, 26, 49, 2029);
    			if (!src_url_equal(img14.src, img14_src_value = "image/art/10.jpg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			attr_dev(img14, "width", "600");
    			add_location(img14, file, 27, 1, 2035);
    			add_location(br13, file, 27, 50, 2084);
    			if (!src_url_equal(img15.src, img15_src_value = "image/art/5.jpg")) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "alt", "");
    			attr_dev(img15, "width", "600");
    			add_location(img15, file, 28, 1, 2091);
    			add_location(br14, file, 28, 49, 2139);
    			if (!src_url_equal(img16.src, img16_src_value = "image/art/14.jpg")) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "alt", "");
    			attr_dev(img16, "width", "600");
    			add_location(img16, file, 29, 1, 2145);
    			add_location(br15, file, 29, 50, 2194);
    			if (!src_url_equal(img17.src, img17_src_value = "image/art/6.jpg")) attr_dev(img17, "src", img17_src_value);
    			attr_dev(img17, "alt", "");
    			attr_dev(img17, "width", "600");
    			add_location(img17, file, 30, 1, 2200);
    			add_location(br16, file, 30, 49, 2248);
    			if (!src_url_equal(img18.src, img18_src_value = "image/art/11.jpg")) attr_dev(img18, "src", img18_src_value);
    			attr_dev(img18, "alt", "");
    			attr_dev(img18, "width", "600");
    			add_location(img18, file, 31, 1, 2254);
    			add_location(br17, file, 31, 50, 2303);
    			if (!src_url_equal(img19.src, img19_src_value = "image/art/12.jpg")) attr_dev(img19, "src", img19_src_value);
    			attr_dev(img19, "alt", "");
    			attr_dev(img19, "width", "600");
    			add_location(img19, file, 32, 1, 2309);
    			add_location(br18, file, 32, 50, 2358);
    			if (!src_url_equal(img20.src, img20_src_value = "image/art/13.jpg")) attr_dev(img20, "src", img20_src_value);
    			attr_dev(img20, "alt", "");
    			attr_dev(img20, "width", "600");
    			add_location(img20, file, 33, 1, 2365);
    			add_location(br19, file, 33, 50, 2414);
    			if (!src_url_equal(img21.src, img21_src_value = "image/art/15.jpg")) attr_dev(img21, "src", img21_src_value);
    			attr_dev(img21, "alt", "");
    			attr_dev(img21, "width", "600");
    			add_location(img21, file, 34, 1, 2420);
    			add_location(br20, file, 34, 50, 2469);
    			add_location(p3, file, 35, 1, 2475);
    			attr_dev(main, "class", "svelte-19ocjkw");
    			add_location(main, file, 6, 0, 88);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, p0);
    			append_dev(main, t5);
    			append_dev(main, img0);
    			append_dev(main, t6);
    			append_dev(main, p1);
    			append_dev(main, t8);
    			append_dev(main, h50);
    			append_dev(main, t10);
    			append_dev(main, img1);
    			append_dev(main, t11);
    			append_dev(main, br0);
    			append_dev(main, t12);
    			append_dev(main, img2);
    			append_dev(main, t13);
    			append_dev(main, br1);
    			append_dev(main, t14);
    			append_dev(main, img3);
    			append_dev(main, t15);
    			append_dev(main, br2);
    			append_dev(main, t16);
    			append_dev(main, img4);
    			append_dev(main, t17);
    			append_dev(main, br3);
    			append_dev(main, t18);
    			append_dev(main, img5);
    			append_dev(main, t19);
    			append_dev(main, br4);
    			append_dev(main, t20);
    			append_dev(main, img6);
    			append_dev(main, t21);
    			append_dev(main, br5);
    			append_dev(main, t22);
    			append_dev(main, img7);
    			append_dev(main, t23);
    			append_dev(main, br6);
    			append_dev(main, t24);
    			append_dev(main, img8);
    			append_dev(main, t25);
    			append_dev(main, br7);
    			append_dev(main, t26);
    			append_dev(main, img9);
    			append_dev(main, t27);
    			append_dev(main, br8);
    			append_dev(main, t28);
    			append_dev(main, p2);
    			append_dev(main, t30);
    			append_dev(main, h51);
    			append_dev(main, t32);
    			append_dev(main, img10);
    			append_dev(main, t33);
    			append_dev(main, br9);
    			append_dev(main, t34);
    			append_dev(main, img11);
    			append_dev(main, t35);
    			append_dev(main, br10);
    			append_dev(main, t36);
    			append_dev(main, img12);
    			append_dev(main, t37);
    			append_dev(main, br11);
    			append_dev(main, t38);
    			append_dev(main, img13);
    			append_dev(main, t39);
    			append_dev(main, br12);
    			append_dev(main, t40);
    			append_dev(main, img14);
    			append_dev(main, t41);
    			append_dev(main, br13);
    			append_dev(main, t42);
    			append_dev(main, img15);
    			append_dev(main, t43);
    			append_dev(main, br14);
    			append_dev(main, t44);
    			append_dev(main, img16);
    			append_dev(main, t45);
    			append_dev(main, br15);
    			append_dev(main, t46);
    			append_dev(main, img17);
    			append_dev(main, t47);
    			append_dev(main, br16);
    			append_dev(main, t48);
    			append_dev(main, img18);
    			append_dev(main, t49);
    			append_dev(main, br17);
    			append_dev(main, t50);
    			append_dev(main, img19);
    			append_dev(main, t51);
    			append_dev(main, br18);
    			append_dev(main, t52);
    			append_dev(main, img20);
    			append_dev(main, t53);
    			append_dev(main, br19);
    			append_dev(main, t54);
    			append_dev(main, img21);
    			append_dev(main, t55);
    			append_dev(main, br20);
    			append_dev(main, t56);
    			append_dev(main, p3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ src_url_equal, name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'engene'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
