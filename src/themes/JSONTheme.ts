/*
 * Copyright 2012-2020 Online-Go.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import { createContext } from "react";
import { GoTheme, GoThemeBackgroundReactStyles, GoThemeBackgroundCSS } from "../GoTheme";
import { GoThemesInterface } from "../GoThemes";
import { _ } from "../translate";
import { GOBAN_FONT } from "../GobanCore";
import { GobanCore } from "../GobanCore";

//import { deviceCanvasScalingRatio } from "../GoUtil";

function getCDNReleaseBase() {
    if (GobanCore.hooks.getCDNReleaseBase) {
        return GobanCore.hooks.getCDNReleaseBase();
    }
    return "";
}

/*
This class makes it easy to design a custom OGS theme using
json and share it on the interent. It also helps artists
design image-based themes that need no code, by supplying a JSON url

Eventually (one hopes) users can supply their own JSON themes & share them

*/

// settings for any image-based theme.
// these settings should always be dumb-easy for anyone to understand or guess
// and should be flexible enough so artists do not need to type too many values in

export class JSONThemeStyle {
    "name": string = "JSON Theme";
    "fuzzyPlacement"?: number = 0.01; // jostle the stones by this factor of radius, e.g. 0.01 (unimplemented)

    "boardColor"?: string = "#DCB35C"; // color of the board beneath the stone
    "boardImage"?: string = ""; // image of the board, URL

    "whiteStones": string[] = []; // list of stone image urls to select randomly & draw
    "blackStones": string[] = [];

    "shadows": string[] = []; // shadow images to be used unless whiteShadows/blackShadows specified
    "whiteShadows"?: string[] = []; // shadows that match the above stones. Can be a single url.
    "blackShadows"?: string[] = [];

    "whiteStoneColor"?: string = "#ffffff"; // perceived color of the stone image, eg #000000
    "blackStoneColor"?: string = "#000000";

    "whiteStoneLineWidth"?: number = 1 / 20;
    "blackStoneLineWidth"?: number = 0;
    "whiteStoneLineColor"?: string = "#000000";
    "blackStoneLineColor"?: string = "#000000";

    "whiteTextColor"?: string = "#000000"; // color to use for labels above white stone
    "blackTextColor"?: string = "#ffffff";

    "boardInkColor"?: string = "#000000"; // a general color for markings on the board when specific colors (below) aren't set
    "boardFadedInkColor"?: string = "#888888"; // a general color for markings when faded
    "boardFont"?: string = GOBAN_FONT;
    "coordinateFont"?: string = ""; //  inherit from boardFont
    "labelFont"?: string = ""; // inherit from boardFont

    "lineColor"?: string = "";
    "fadedLineColor"?: string = ""; // line color when board is "faded out"
    "starColor"?: string = "";
    "fadedStarColor"?: string = "";
    "blankTextColor"?: string = ""; // color for text on empty intersections
    "coordinateColor"?: string = ""; // for coordinates

    // these fields are required for JSONTheme, but
    // are optional for the artist to input
    "rotations": Array<number> = [0]; // general rotation for shadow & either stone
    "sizes": Array<[number, number] | number> = [1]; // general scaling for shadows & either stone
    "offsets": Array<[number, number]> = [[0, 0]]; // general offsets for shadows & either stone

    // offsets & scales if needed; the defaults are 0,0 and 1.0
    "stoneOffsets": Array<[number, number]> = [[0, 0]]; // general offset for both stones, added to the below values if provided
    "whiteStoneOffsets": Array<[number, number]> = [[0, 0]];
    "blackStoneOffsets": Array<[number, number]> = [[0, 0]];

    "stoneSizes": Array<[number, number] | number> = [1]; // general scale of both stones, multipled to below values if provided
    "whiteStoneSizes": Array<[number, number] | number> = [1, 1]; // allow x/y scaling or just uniform scale
    "blackStoneSizes": Array<[number, number] | number> = [1, 1];

    "stoneRotations": Array<number> = [0, 0]; // general rotations for both stones, added to below values if provided
    "whiteStoneRotations": Array<number> = [0, 0];
    "blackStoneRotations": Array<number> = [0, 0];

    "shadowOffsets": Array<[number, number]> = [[0, 0]]; // general shadow offset for both stones, added to the below values
    "whiteShadowOffsets": Array<[number, number]> = [[0, 0]];
    "blackShadowOffsets": Array<[number, number]> = [[0, 0]];

    "shadowSizes": Array<[number, number] | number> = [1]; // general shadow scale for both stones, multiplied with below values
    "whiteShadowSizes": Array<[number, number] | number> = [1, 1]; // allow x/y scaling or just uniform scale
    "blackShadowSizes": Array<[number, number] | number> = [1, 1];

    "shadowRotations": Array<number> = [0]; // general rotations for both stones, added to the below values
    "blackShadowRotations": Array<number> = [0];
    "whiteShadowRotations": Array<number> = [0];

    "priority": number = 4; // number used for sorting on screen, greater == later, 100 is typical -- FIXME shouldn't really be user-assignable
    "randomSeed": number = 2083; // in case the stones look dorky with built-in seed

    // theme designer can expand the bounding box for prettier (but slower) draws
    "stoneBoundingBox": Array<number> = [];
    "shadowBoundingBox": Array<number> = [];
    "markingsBoundingBox": Array<number> = [];
}

// each context gets exactly one cache per img
// and cache rebuilds when width changes
// this saves memory but might slow down funky
// themes that randomize scaling
interface CachedBitmap {
    width: number; // to fit in this width
    bmp: HTMLCanvasElement;
}

class DeferredImage {
    // lazy-loaded & prescaled image for a url source + particular rendering context
    srcImg: HTMLImageElement;

    bmps: WeakMap<CanvasRenderingContext2D, CachedBitmap> = new WeakMap();

    constructor(url: string, cb?: Function) {
        const img = new Image();
        //img.onload = () => this.loaded.bind(this, img, cb);
        img.addEventListener("load", this.loaded.bind(this, img, cb));
        img.src = url;
        img.loading = "eager";
        this.srcImg = img;
    }

    get stillLoading(): boolean {
        return !this.srcImg.complete;
    }

    get failed(): boolean {
        return !this.stillLoading && this.srcImg.naturalWidth <= 0;
    }

    drawInto(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
    ): boolean {
        if (!this.srcImg.complete) {
            // try anyway
            //ctx.drawImage(this.srcImg, x, y, width, height);
            return false; // maybe give a callback when ready
        }

        if (this.failed) {
            console.warn(`ingnoring image that failed to load: ${this.srcImg.src}`);
            return false;
        }

        const cached = this.bmps.get(ctx);

        if (cached) {
            // adapt to current canvas transform
            const scale = ctx.getTransform()["m11"];
            if (cached.width === width * scale) {
                ctx.drawImage(cached.bmp, x, y, width, height);
            } else {
                if (!this.srcImg) {
                    return false;
                }

                this.rebuild(width * scale, ctx);
                const c = this.bmps.get(ctx);
                if (c) {
                    ctx.drawImage(c.bmp, x, y, width, height);
                } else {
                    ctx.drawImage(this.srcImg, x, y, width, height);
                }
            }
        } else {
            const scale = ctx.getTransform()["m11"]; // adaptive is nice, but could be faster if client explicitly sets width when needed
            this.rebuild(width * scale, ctx);
            const c = this.bmps.get(ctx);
            if (c) {
                ctx.drawImage(c.bmp, x, y, width, height);
            } else {
                ctx.drawImage(this.srcImg, x, y, width, height);
            }
        }
        return true;
    }

    drawIntoDeferred(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        repeatCnt: number = 0,
        startTransform: any = null,
    ) {
        // The board canvas doesn't  work with deferred rendering;
        // OGS Theme picker doesn't work without it.
        // Try to satisfy both until OGS draws theme icons
        // lazily or Themes can provide their own icon IMG
        if (repeatCnt) {
            console.log(`repeat draw: ${repeatCnt} ${this.srcImg.src}`, ctx);
        }

        if (!ctx || this.failed) {
            if (this.failed) {
                console.warn(`Failed to load image ${this.srcImg.src}`);
            }
            if (!ctx) {
                console.warn(`Missing context to draw image ${this.srcImg.src}`);
            }
            return;
        }

        if (!this.stillLoading) {
            if (repeatCnt) {
                console.log(`Image loaded, will draw: ${this.srcImg.src}`);
                // transform & other contextual stuff can change between timeout calls,
                // so:
                const trans = ctx.getTransform();
                if (startTransform) {
                    ctx.setTransform(startTransform);
                }
                // ctx.drawImage(this.srcImg, x, y, width, height);
                this.drawInto(ctx, x, y, width, height);
                ctx.setTransform(trans);
            } else {
                this.drawInto(ctx, x, y, width, height);
            }
        } else {
            if (!this.failed) {
                if (repeatCnt < 100) {
                    // console.log("Queue a draw  with repeats: ", repeatCnt, this.srcImg.src);
                    // keep track of initiating transform
                    let trans = ctx.getTransform();
                    if (startTransform) {
                        trans = startTransform;
                    }
                    setTimeout(
                        this.drawIntoDeferred.bind(this),
                        100,
                        ctx,
                        x,
                        y,
                        width,
                        height,
                        repeatCnt + 1,
                        trans,
                    );
                }
            } else {
                console.warn(`Failed to load image ${this.srcImg.src}`);
            }
        }
    }

    private loaded(img: HTMLImageElement, cb?: Function) {
        //console.log("IMAGE READY ", this.srcImg.src);
        if (!img.complete || img.naturalWidth <= 0) {
            console.warn("IMAGE FAILED TO LOAD:", this.srcImg.src);
        }
        if (cb) {
            cb();
        }
    }

    private validImage() {
        return this.srcImg && this.srcImg.complete && this.srcImg.naturalWidth > 0;
    }

    public rebuild(width: number, ctx: CanvasRenderingContext2D) {
        if (this.failed) {
            // not much to do but shrug. (or render a red box?)
            return;
        }

        const ratio = this.srcImg.naturalHeight / this.srcImg.naturalWidth;

        const canvas = document.createElement("canvas");
        const w = Math.ceil(width);
        const h = Math.ceil(width * ratio);

        canvas.setAttribute("width", `${w}px`);
        canvas.setAttribute("height", `${h}px`);
        const ictx = canvas.getContext("2d");
        if (ictx) {
            ictx.drawImage(this.srcImg, 0, 0, w, h);

            const cached: CachedBitmap = {
                width: width,
                bmp: canvas,
            };
            this.bmps.set(ctx, cached);
        }
    }
}

type TransformArity = [number, number, number, number, number, number];
const IDENTITY_TRANSFORM: TransformArity = [1, 0, 0, 1, 0, 0];

class MatrixStore {
    whiteMatrix: TransformArity = IDENTITY_TRANSFORM;
    blackMatrix: TransformArity = IDENTITY_TRANSFORM;
    whiteShadowMatrix: TransformArity = IDENTITY_TRANSFORM;
    blackShadowMatrix: TransformArity = IDENTITY_TRANSFORM;
    rando: number = 42;
}

export class JSONTheme extends GoTheme {
    public json: string = "{}";
    public name: string;
    public styles: { [style_name: string]: string } = {};
    public themeStyle: JSONThemeStyle = new JSONThemeStyle();
    public readonly isJSONTheme: boolean = true;
    protected parent?: GoTheme; // An optional parent theme

    protected whiteImages: DeferredImage[] = [];
    protected blackImages: DeferredImage[] = [];
    protected whiteShadowImages: DeferredImage[] = [];
    protected blackShadowImages: DeferredImage[] = [];
    protected matrices: Array<MatrixStore> = [];

    constructor(parent?: GoTheme) {
        super();
        this.name = "JSONTheme"; //this.themeStyle.themeName
        this.parent = parent;

        if (!this.themeStyle) {
            this.themeStyle = new JSONThemeStyle();
        }

        if (this.json && this.json.length > 4) {
            this.loadFromText(this.json);
        } else {
            this.loadFromText(JSONTheme.getDefaultJSON());
        }
    }

    public rebuildImages() {
        this.whiteImages = [];
        this.blackImages = [];
        this.whiteShadowImages = [];
        this.blackShadowImages = [];

        if (this.themeStyle.whiteStones && this.themeStyle.whiteStones.length > 0) {
            for (const src of this.themeStyle.whiteStones) {
                const img = new DeferredImage(src);
                this.whiteImages.push(img);
            }
        }

        if (this.themeStyle.blackStones && this.themeStyle.blackStones.length > 0) {
            for (const src of this.themeStyle.blackStones) {
                const img = new DeferredImage(src);
                this.blackImages.push(img);
            }
        }

        if (this.themeStyle.whiteShadows && this.themeStyle.whiteShadows.length > 0) {
            for (const src of this.themeStyle.whiteShadows) {
                const img = new DeferredImage(src);
                this.whiteShadowImages.push(img);
            }
        }

        if (this.themeStyle.blackShadows && this.themeStyle.blackShadows.length > 0) {
            for (const src of this.themeStyle.blackShadows) {
                const img = new DeferredImage(src);
                this.blackShadowImages.push(img);
            }
        }

        // created default shadows if needed
        if (this.themeStyle.shadows && this.themeStyle.shadows.length > 0) {
            if (this.whiteShadowImages.length === 0) {
                for (const src of this.themeStyle.shadows) {
                    const img = new DeferredImage(src);
                    this.whiteShadowImages.push(img);
                }
            }
            if (this.blackShadowImages.length === 0) {
                for (const src of this.themeStyle.shadows) {
                    const img = new DeferredImage(src);
                    this.blackShadowImages.push(img);
                }
            }
        }
    }

    protected rebuildMatrices(seed: number) {
        this.matrices = this.buildMatrices(seed);
    }
    protected buildMatrices(seed: number): Array<MatrixStore> {
        function transform_the_transform(matrix: any): TransformArity {
            return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
        }

        let rando = 31 * seed + 73 * seed; // not sure if i need extra salt but whatevah

        let dummy: HTMLCanvasElement;
        let ctx;
        if (typeof document !== "undefined") {
            dummy = document.createElement("canvas");
            dummy.setAttribute("width", "256px");
            dummy.setAttribute("height", "256px");
            ctx = dummy.getContext("2d");

            if (!ctx) {
                throw new Error("Error getting stone context 2d");
            }

            const matrixArray: Array<MatrixStore> = [];

            for (let i = 0; i < 15; i++) {
                // 15 should be enough ?
                const matrices = new MatrixStore();

                ctx.resetTransform();
                this.activateMatrixFor(ctx, "white", rando);
                matrices.whiteMatrix = transform_the_transform(ctx.getTransform());

                ctx.resetTransform();
                this.activateMatrixFor(ctx, "black", rando);
                matrices.blackMatrix = transform_the_transform(ctx.getTransform());

                ctx.resetTransform();
                this.activateMatrixFor(ctx, "whiteShadow", rando);
                matrices.whiteShadowMatrix = transform_the_transform(ctx.getTransform());

                ctx.resetTransform();
                this.activateMatrixFor(ctx, "blackShadow", rando);
                matrices.blackShadowMatrix = transform_the_transform(ctx.getTransform());

                matrices.rando = rando;

                matrixArray.push(matrices);
                rando = rando + 73 * rando;
            }
            return matrixArray;
        } else {
            throw new Error(
                "JSONTheme: Couldn't build a graphics context to calculate stone matrices (sry!) ",
            );
        }
    }

    public loadFromURL(url: string) {}

    protected loadFromText(text: string): boolean {
        // FIXME this and parseJSON are kinda the same thing
        try {
            const j = JSON.parse(text);
            const s = new JSONThemeStyle() as any; // construct default item to check the keys & type values
            const jt = new JSONThemeStyle() as any;

            for (const k in j) {
                if (s[k] !== undefined && typeof s[k] === typeof j[k]) {
                    jt[k] = j[k];
                }
            }

            this.themeStyle = jt as JSONThemeStyle;

            this.rebuildImages();
            this.rebuildMatrices(this.themeStyle.randomSeed);

            return true;
        } catch (err) {
            console.log(err); // FIXME: parse error is not severe enough to crash OGS, but should tell user
            return false;
        }
    }

    public parseJSON(): boolean {
        try {
            const j = JSON.parse(this.json);
            const s = new JSONThemeStyle() as any; // construct default item to check the keys & type values
            const jt = new JSONThemeStyle() as any;

            for (const k in j) {
                if (s[k] !== undefined && typeof s[k] === typeof j[k]) {
                    jt[k] = j[k];
                }
            }

            this.themeStyle = jt as JSONThemeStyle;

            return true;
        } catch (err) {
            console.log(err); // FIXME: parse error is not severe enough to crash OGS, but should tell user
            return false;
        }
    }

    public setJSON(text: string) {
        this.json = text;
        this.parseJSON();
        //console.log(this.json)
        //console.log(this.themeStyle)
    }

    get theme_name(): string {
        if (this.themeStyle.name) {
            return this.themeStyle.name;
        } else {
            return "JSONTheme";
        }
        //return this.themeStyle.name;
    }

    public sort(): number {
        return this.themeStyle.priority;
    }

    public getStyles(): JSONThemeStyle {
        return this.themeStyle;
    }

    public preRenderStone(radius: number, seed: number) {
        // just build some static seeds so the stones don't wiggle from using position as a seed
        let rando = seed * 181;
        const arrayOfSeeds = [];

        for (let i = 0; i < 50; ++i) {
            arrayOfSeeds.push({ rando: rando });
            rando = rando * 181 + 29 * rando; // meh, too lazy for rng, it's just stones
        }

        return arrayOfSeeds; // this.preRenderStone(radius, seed);
    }

    /* Returns an array of black stone objects. The structure
     * of the array elements is up to the implementor, as they are passed
     * verbatim to the placeBlackStone method */
    public preRenderBlack(radius: number, seed: number): any {
        return this.preRenderStone(radius, seed);
    }

    /* Returns an array of white stone objects. The structure
     * of the array elements is up to the implementor, as they are passed
     * verbatim to the placeWhiteStone method */
    public preRenderWhite(radius: number, seed: number): any {
        return this.preRenderStone(radius, seed);
    }

    public multiRotate(
        ctx: CanvasRenderingContext2D,
        rotations: Array<Array<number>>,
        rando: number,
    ) {
        let tot = 0;
        for (const r of rotations) {
            if (r.length > 0) {
                tot += r[rando % r.length];
            }
        }
        ctx.rotate((tot * Math.PI) / 180.0);
    }

    public multiTranslate(
        ctx: CanvasRenderingContext2D,
        translations: Array<Array<[number, number]>>,
        rando: number,
        inverse: boolean = false,
    ) {
        let x = 0;
        let y = 0;

        for (const t of translations) {
            if (t.length > 0) {
                x += t[rando % t.length][0];
                y += t[rando % t.length][1];
            }
        }
        if (inverse) {
            ctx.translate(-x, -y);
        } else {
            ctx.translate(x, y);
        }
    }

    public multiScale(
        ctx: CanvasRenderingContext2D,
        scales: Array<Array<[number, number] | number>>,
        rando: number,
    ) {
        for (const s of scales) {
            if (s.length > 0) {
                if (typeof s[rando % s.length] === "number") {
                    const thescale = s[rando % s.length] as number;
                    ctx.scale(thescale, thescale);
                } else {
                    const thescale = s[rando % s.length] as [number, number];
                    if (thescale) {
                        ctx.scale(thescale[0], thescale[1]);
                    }
                }
            }
        }
    }

    public activateMatrixFor(ctx: CanvasRenderingContext2D, kind: string, rando: number) {
        const rots = this.themeStyle.rotations;
        const offs = this.themeStyle.offsets;
        const sizes = this.themeStyle.sizes;

        const stoneRots = this.themeStyle.stoneRotations;
        const stoneOffs = this.themeStyle.stoneOffsets;
        const stoneSizes = this.themeStyle.stoneSizes;

        const shadRots = this.themeStyle.shadowRotations;
        const shadOffs = this.themeStyle.shadowOffsets;
        const shadSizes = this.themeStyle.shadowSizes;

        switch (kind) {
            case "white":
                this.multiTranslate(
                    ctx,
                    [offs, stoneOffs, this.themeStyle.whiteStoneOffsets],
                    rando,
                    false,
                );
                this.multiScale(ctx, [sizes, stoneSizes, this.themeStyle.whiteStoneSizes], rando);
                this.multiRotate(
                    ctx,
                    [rots, stoneRots, this.themeStyle.whiteStoneRotations],
                    rando,
                );
                break;
            case "black":
                this.multiTranslate(
                    ctx,
                    [offs, stoneOffs, this.themeStyle.blackStoneOffsets],
                    rando,
                    false,
                );
                this.multiScale(ctx, [sizes, stoneSizes, this.themeStyle.blackStoneSizes], rando);
                this.multiRotate(
                    ctx,
                    [rots, stoneRots, this.themeStyle.blackStoneRotations],
                    rando,
                );
                break;
            case "blackShadow":
                this.multiTranslate(
                    ctx,
                    [offs, shadOffs, this.themeStyle.blackShadowOffsets],
                    rando,
                    false,
                );
                this.multiScale(ctx, [sizes, shadSizes, this.themeStyle.blackShadowSizes], rando);
                this.multiRotate(
                    ctx,
                    [rots, shadRots, this.themeStyle.blackShadowRotations],
                    rando,
                );
                break;
            case "whiteShadow":
                this.multiTranslate(
                    ctx,
                    [offs, shadOffs, this.themeStyle.whiteShadowOffsets],
                    rando,
                    false,
                );
                this.multiScale(ctx, [sizes, shadSizes, this.themeStyle.whiteShadowSizes], rando);
                this.multiRotate(
                    ctx,
                    [rots, shadRots, this.themeStyle.whiteShadowRotations],
                    rando,
                );
        }
    }

    /* Places a pre rendered stone onto the canvas, centered at cx, cy */
    public placeWhiteStone(
        ctx: CanvasRenderingContext2D,
        shadow_ctx: CanvasRenderingContext2D | null,
        stone: any,
        cx: number,
        cy: number,
        radius: number,
    ) {
        // random by position ( jumping-bean stones fixed by using constant seed in prerenderstone())
        // const rando = Math.floor(cx * 31 + cy * 29);
        //console.log(JSON.stringify(stone))

        // OGS tries to place a stone manually using the same context for shadow & stone
        // This would work if images are already loaded, but if shadow is loaded after
        // the stone, it will get drawn on top of the stone & erase it
        // so if ctx === shadow_ctx, set the shadow_ctx to null
        if (ctx === shadow_ctx) {
            shadow_ctx = null;
        }
        if (this.whiteImages.length > 0) {
            if (shadow_ctx && this.whiteShadowImages.length > 0) {
                const img = this.whiteShadowImages[stone.rando % this.whiteShadowImages.length];

                const t = shadow_ctx.getTransform();

                shadow_ctx.translate(cx, cy);
                shadow_ctx.scale(radius * 2.0, radius * 2.0);
                const m = this.matrices[stone.rando % this.matrices.length]["whiteShadowMatrix"];
                shadow_ctx.transform(...m);

                img.drawIntoDeferred(shadow_ctx, -0.5, -0.5, 1.0, 1.0);

                shadow_ctx.setTransform(t);
            }

            if (ctx) {
                const img = this.whiteImages[stone.rando % this.whiteImages.length];

                const t = ctx.getTransform();

                ctx.translate(cx, cy);
                ctx.scale(radius * 2.0, radius * 2.0);
                const m = this.matrices[stone.rando % this.matrices.length]["whiteMatrix"];
                ctx.transform(...m);

                img.drawIntoDeferred(ctx, -0.5, -0.5, 1.0, 1.0); // unit box centered around cx, cy

                ctx.setTransform(t);
            }
        } else {
            if (shadow_ctx && this.whiteShadowImages.length > 0) {
                const img = this.whiteShadowImages[stone.rando % this.whiteShadowImages.length];

                const t = shadow_ctx.getTransform();

                shadow_ctx.translate(cx, cy);
                shadow_ctx.scale(radius * 2.0, radius * 2.0);
                const m = this.matrices[stone.rando % this.matrices.length]["whiteShadowMatrix"];
                shadow_ctx.transform(...m);

                img.drawIntoDeferred(shadow_ctx, -0.5, -0.5, 1.0, 1.0); // unit box centered around cx, cy

                shadow_ctx.setTransform(t);
            }
            if (ctx) {
                const t = ctx.getTransform();
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(radius * 2, radius * 2);
                const m = this.matrices[stone.rando % this.matrices.length]["whiteMatrix"];
                ctx.transform(...m);

                ctx.fillStyle = this.getWhiteStoneColor();
                ctx.strokeStyle = this.getWhiteStoneLineColor();
                ctx.lineWidth = this.getWhiteStoneLineWidth();
                ctx.beginPath();
                //ctx.arc(cx, cy, radius, 0, 2 * Math.PI, true);
                ctx.arc(0, 0, 0.5, 0, 2 * Math.PI, true);
                ctx.fill();
                if (this.getWhiteStoneLineWidth() > 0) {
                    ctx.stroke();
                }
                ctx.restore();
                ctx.setTransform(t);
            }
        }
    }

    public placeBlackStone(
        ctx: CanvasRenderingContext2D,
        shadow_ctx: CanvasRenderingContext2D | null,
        stone: any,
        cx: number,
        cy: number,
        radius: number,
    ) {
        // OGS tries to place a stone manually using the same context for shadow & stone
        // This would work if images are already loaded, but if shadow is loaded after
        // the stone, it will get drawn on top of the stone & erase it
        // so if ctx === shadow_ctx, set the shadow_ctx to null
        if (ctx === shadow_ctx) {
            shadow_ctx = null;
        }

        if (this.blackImages.length > 0) {
            if (shadow_ctx && this.blackShadowImages.length > 0) {
                const img = this.blackShadowImages[stone.rando % this.blackShadowImages.length];

                const t = shadow_ctx.getTransform();

                shadow_ctx.translate(cx, cy);
                shadow_ctx.scale(radius * 2.0, radius * 2.0);

                const m = this.matrices[stone.rando % this.matrices.length]["blackShadowMatrix"];
                shadow_ctx.transform(...m);

                img.drawIntoDeferred(shadow_ctx, -0.5, -0.5, 1.0, 1.0); // unit box centered around cx, cy

                shadow_ctx.setTransform(t);
            }
            if (ctx) {
                const img = this.blackImages[stone.rando % this.blackImages.length];

                const t = ctx.getTransform();
                ctx.translate(cx, cy);
                ctx.scale(radius * 2.0, radius * 2.0);
                const m = this.matrices[stone.rando % this.matrices.length]["blackMatrix"];
                ctx.transform(...m);

                img.drawIntoDeferred(ctx, -0.5, -0.5, 1.0, 1.0); // unit box centered around cx, cy

                ctx.setTransform(t);
            }
        } else {
            if (shadow_ctx && this.blackShadowImages.length > 0) {
                const img = this.blackShadowImages[stone.rando % this.blackShadowImages.length];

                const t = shadow_ctx.getTransform();
                shadow_ctx.translate(cx, cy);
                shadow_ctx.scale(radius * 2.0, radius * 2.0);
                const m = this.matrices[stone.rando % this.matrices.length]["blackShadowMatrix"];
                shadow_ctx.transform(...m);
                img.drawIntoDeferred(shadow_ctx, -0.5, -0.5, 1.0, 1.0); // unit box centered around cx, cy

                shadow_ctx.setTransform(t);
            }
            if (ctx) {
                const t = ctx.getTransform();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(radius * 2, radius * 2);

                const m = this.matrices[stone.rando % this.matrices.length]["blackMatrix"];
                ctx.transform(...m);

                ctx.fillStyle = this.getBlackStoneColor();
                ctx.strokeStyle = this.getBlackStoneLineColor();
                ctx.lineWidth = this.getBlackStoneLineWidth();
                ctx.beginPath();
                ctx.arc(0, 0, 0.5, 0, 2 * Math.PI, true);
                ctx.fill();
                if (this.getBlackStoneLineWidth() > 0) {
                    ctx.stroke();
                }
                ctx.restore();
                ctx.setTransform(t);
            }
        }
    }

    public getStoneBoundingBox() {
        // return a left,top,right,bottom box describing the maximum needed draw area
        // for intesection contents
        // where 1.0 = a single square
        // FIXME: this should be calculated per theme according to image box sizes
        if (this.themeStyle.stoneBoundingBox && this.themeStyle.stoneBoundingBox.length === 4) {
            return this.themeStyle.stoneBoundingBox;
        }
        return [-1, -1, 2, 2];
    }

    public getShadowBoundingBox() {
        // return a left,top,right,bottom box describing the maximum needed draw area
        // for intesection contents
        // where 1.0 = a single square
        // FIXME: this should be calculated per theme according to image box sizes
        if (this.themeStyle.shadowBoundingBox && this.themeStyle.shadowBoundingBox.length === 4) {
            return this.themeStyle.shadowBoundingBox;
        }
        return [-0.75, -0.75, 1.25, 1.25];
    }

    public getMarkingsBoundingBox() {
        if (
            this.themeStyle.markingsBoundingBox &&
            this.themeStyle.markingsBoundingBox.length === 4
        ) {
            return this.themeStyle.markingsBoundingBox;
        }
        return [0, 0, 1, 1];
    }

    /* Should return true if you would like the shadow layer to be present. False
     * speeds up rendering typically */
    public stoneCastsShadow(radius: number): boolean {
        if (radius < 10) {
            return false;
        }

        for (const s of [
            this.themeStyle.shadows,
            this.themeStyle.blackShadows,
            this.themeStyle.whiteShadows,
        ]) {
            if (s && s.length > 0) {
                return true;
            }
        }
        return false;
    }

    /* Returns the color that should be used for white stones */
    public getWhiteStoneColor(): string {
        if (this.themeStyle.whiteStoneColor) {
            return this.themeStyle.whiteStoneColor;
        } else {
            return "#ffffff";
        }
    }

    public getWhiteStoneLineColor(): string {
        if (this.themeStyle.whiteStoneLineColor) {
            return this.themeStyle.whiteStoneLineColor;
        } else {
            return this.getWhiteTextColor();
        }
    }

    public getWhiteStoneLineWidth(): number {
        if (this.themeStyle.whiteStoneLineWidth !== undefined) {
            return this.themeStyle.whiteStoneLineWidth;
        } else {
            return 1 / 20;
        }
    }

    /* Returns the color that should be used for black stones */
    public getBlackStoneColor(): string {
        if (this.themeStyle.blackStoneColor) {
            return this.themeStyle.blackStoneColor;
        } else {
            return "#000000";
        }
    }

    public getBlackStoneLineColor(): string {
        if (this.themeStyle.blackStoneLineColor) {
            return this.themeStyle.blackStoneLineColor;
        } else {
            return "#000000";
        } // black stones are usuallly dark and don't need a line
    }

    public getBlackStoneLineWidth(): number {
        if (this.themeStyle.blackStoneLineWidth) {
            return this.themeStyle.blackStoneLineWidth;
        } else {
            return 0;
        } // black stones are usuallly dark and don't need a line
    }

    /* Returns the color that should be used for text over white stones */
    public getWhiteTextColor(color?: string): string {
        if (this.themeStyle.whiteTextColor) {
            return this.themeStyle.whiteTextColor;
        } else {
            return "#000000";
        }
    }

    /* Returns the color that should be used for text over black stones */
    public getBlackTextColor(color?: string): string {
        if (this.themeStyle.blackTextColor) {
            return this.themeStyle.blackTextColor;
        } else {
            return "#ffffff";
        }
    }

    public getBoardFont(): string {
        if (this.themeStyle.boardFont) {
            return this.themeStyle.boardFont;
        } else {
            return GOBAN_FONT;
        }
    }

    public getLabelFont(): string {
        if (this.themeStyle.labelFont) {
            return this.themeStyle.labelFont;
        } else {
            return this.getBoardFont();
        }
    }

    public getCoordinateFont(): string {
        if (this.themeStyle.coordinateFont) {
            return this.themeStyle.coordinateFont;
        } else {
            return this.getBoardFont();
        }
    }

    /* Returns a set of CSS styles that should be applied to the background layer (ie the board) */
    public getBackgroundCSS(): GoThemeBackgroundCSS {
        if (this.themeStyle.boardImage) {
            return {
                "background-image": `url("${this.themeStyle.boardImage}")`,
                "background-color": this.themeStyle.boardColor,
                "background-size": "cover",
            };
        } else {
            return {
                "background-color": this.themeStyle.boardColor,
                "background-image": "",
            };
        }
    }

    /* Returns a set of CSS styles (for react) that should be applied to the background layer (ie the board) */
    public getReactStyles(): GoThemeBackgroundReactStyles {
        const ret: GoThemeBackgroundReactStyles = {};
        const css: GoThemeBackgroundCSS = this.getBackgroundCSS();

        ret.backgroundColor = css["background-color"];
        ret.backgroundImage = css["background-image"];

        return ret;
    }

    /* Returns the color that should be used for lines */
    public getLineColor(): string {
        if (this.themeStyle.lineColor) {
            return this.themeStyle.lineColor;
        } else if (this.themeStyle.boardInkColor) {
            return this.themeStyle.boardInkColor;
        } else {
            return "#000000";
        }
    }

    /* Returns the color that should be used for lines * when there is text over the square */
    public getFadedLineColor(): string {
        if (this.themeStyle.fadedLineColor) {
            return this.themeStyle.fadedLineColor;
        } else if (this.themeStyle.boardFadedInkColor) {
            return this.themeStyle.boardFadedInkColor;
        } else {
            return "#888888";
        }
    }

    /* Returns the color that should be used for star points */
    public getStarColor(): string {
        if (this.themeStyle.starColor) {
            return this.themeStyle.starColor;
        } else if (this.themeStyle.boardInkColor) {
            return this.themeStyle.boardInkColor;
        } else {
            return "#000000";
        }
    }

    /* Returns the color that should be used for star points
     * when there is text over the square */
    public getFadedStarColor(): string {
        if (this.themeStyle.fadedStarColor) {
            return this.themeStyle.fadedStarColor;
        } else if (this.themeStyle.boardFadedInkColor) {
            return this.themeStyle.boardFadedInkColor;
        } else {
            return "#888888";
        }
    }

    /* Returns the color that text should be over empty intersections */
    public getBlankTextColor(): string {
        if (this.themeStyle.blankTextColor) {
            return this.themeStyle.blankTextColor;
        } else if (this.themeStyle.boardInkColor) {
            return this.themeStyle.boardInkColor;
        } else {
            return "#000000";
        }
    }

    /** Returns the color that should be used for labels */
    public getLabelTextColor(): string {
        if (this.themeStyle.coordinateColor) {
            return this.themeStyle.coordinateColor;
        } else if (this.themeStyle.boardInkColor) {
            return this.themeStyle.boardInkColor;
        } else {
            return "#000000";
        }
    }

    public static getStockThemes(): string[] {
        // these are stock themes used in GetGoThemeLists() in GoThemes.js
        // currently they use github/dropbox addresses
        // for testing. Presumably the client will create their own themes
        // and pass them to insertTheme()
        const t = [];
        const USE_RELEASE = false; // use release versions of images (will not work if assets are not copied to online-go project)

        if (USE_RELEASE) {
            t.push(`
        {
            "name": "hikaru",
            "boardImage": "${getCDNReleaseBase()}/img/hikaru_board.svg",
            "boardColor": "#dcc083",
            "boardInkColor": "rgb(76, 47, 0, 0.8)", "boardColor": "#d2b473",
            "boardFont": "Helvetica Neue,Helvetica,Arial,Verdana,sans-serif",
            "whiteStones": [
                "${getCDNReleaseBase()}/img/hikaru_white.svg"
            ],
            "blackStones": [
                "${getCDNReleaseBase()}/img/hikaru_black.svg"
            ],
            "shadows": [
                "${getCDNReleaseBase()}/img/hikaru_shadow.svg"
            ],
            "sizes": [0.98],
            "shadowOffsets": [[0.02, 0.1]],
            "shadowSizes": [[1.05, 1.1]],
            "stoneBoundingBox": [0,0,1,1]
        }
        `);
        } else {
            t.push(`
        {
            "name": "hikaru",
            "boardImage": "https://raw.githubusercontent.com/upsided/Upsided-Sabaki-Themes/main/hikaru/board.svg",
            "boardColor": "#dcc083",
            "boardInkColor": "rgb(76, 47, 0, 0.8)", "boardColor": "#d2b473",
            "boardFont": "Helvetica Neue,Helvetica,Arial,Verdana,sans-serif",
            "whiteStones": [
                "https://raw.githubusercontent.com/upsided/Upsided-OGS-Themes/main/ogs-hikaru/hikaru_white_stone_raw.svg"
            ],
            "blackStones": [
                "https://raw.githubusercontent.com/upsided/Upsided-OGS-Themes/main/ogs-hikaru/hikaru_black_stone_raw.svg"
            ],
            "shadows": [
                "https://raw.githubusercontent.com/upsided/Upsided-OGS-Themes/main/ogs-hikaru/hikaru_stone_shadow.svg"
            ],
            "shadowOffsets": [[0.02, 0.1]],
            "shadowSizes": [1.1],
            "stoneBoundingBox": [0,0,1,1]
        }
        `);
        }

        if (USE_RELEASE) {
            t.push(`
        {
            "name": "BadukBroadcast",
            "boardImage": "${getCDNReleaseBase()}/img/baduktv_board.png",
            "boardColor": "#cea67b",
            "boardInkColor": "#634222",
            "boardFont": "Tahoma,Verdana,sans-serif",
            "whiteStones": [
                "${getCDNReleaseBase()}/img/baduktv_white_1.png",
                "${getCDNReleaseBase()}/img/baduktv_white_2.png",
                "${getCDNReleaseBase()}/img/baduktv_white_3.png"
            ],
            "blackStones": [
                "${getCDNReleaseBase()}/img/baduktv_black_1.png",
                "${getCDNReleaseBase()}/img/baduktv_black_2.png",
                "${getCDNReleaseBase()}/img/baduktv_black_3.png"
            ],
            "shadows": [
                "${getCDNReleaseBase()}/img/baduktv_shadow.png"
            ],
            "sizes": [0.95],
            "blackStoneSizes": [1.08],
            "whiteShadowSizes": [2.2],
            "blackShadowSizes": [2.28],
            "offsets": [[0.005, 0.001], [0.002, -0.008], [-0.008, 0.0]]

        }
        `);
        } else {
            t.push(`
            {
                "name": "BadukBroadcast",
                "boardImage": "https://dl.dropboxusercontent.com/s/nbhkek3wbf804d3/baduktv_board.png?dl=1",
                "boardColor": "#cea67b",
                "boardInkColor": "#634222",
                "boardFont": "Tahoma,Verdana,sans-serif",
                "whiteStones": [
                    "https://dl.dropboxusercontent.com/s/tcxdcd7cgtqqwkv/baduktv_white_1.png?dl=1",
                    "https://dl.dropboxusercontent.com/s/6q2c2a8u8xgdnt6/baduktv_white_2.png?dl=1",
                    "https://dl.dropboxusercontent.com/s/r6vqyjp0vhshzkb/baduktv_white_3.png?dl=1"
                ],
                "blackStones": [
                    "https://dl.dropboxusercontent.com/s/a0r1gjvoz205fl4/baduktv_black_1.png?dl=1",
                    "https://dl.dropboxusercontent.com/s/0db1iscd0qtpx4u/baduktv_black_2.png?dl=1",
                    "https://dl.dropboxusercontent.com/s/7lweyxyzoi62s1u/baduktv_black_3.png?dl=1"
                ],
                "shadows": [
                    "https://dl.dropboxusercontent.com/s/w85dqpuox1fw4v1/baduktv_shadow.png?dl=1"
                ],
                "sizes": [0.95],
                "blackStoneSizes": [1.08],
                "whiteShadowSizes": [2.2],
                "blackShadowSizes": [2.28],
                "offsets": [[0.005, 0.001], [0.002, -0.008], [-0.008, 0.0]]
    
            }
        `);
        }

        t.push(` 
        {
            "name": "kibitz",
            "boardColor": "#e4bb66",
            "boardInkColor": "#70601c",
            "boardFont": "Trebuchet,Helvetica,Arial,Verdana,sans-serif",
            "whiteStoneColor": "#f2f2f2",
            "whiteStoneLineWidth": 0,
            "blackStoneColor": "#333333",
            "blackTextColor": "#ebebeb",
            "whiteTextColor": "#484848",
            "sizes": [1.0],
            "stoneBoundingBox": [0,0,1,1]
        }
        `);

        if (USE_RELEASE) {
            t.push(`
        {
            "name": "Happy Stones",
            "boardImage": "${getCDNReleaseBase()}/img/happy_stones_board.png",
            "whiteStones": [
                "${getCDNReleaseBase()}/img/happy_stones_white.png"
            ],
            "blackStones": [
                "${getCDNReleaseBase()}/img/happy_stones_black.png"
            ],
            "sizes": [2],
            "offsets": [[0.41,0.41]],
            "stoneBoundingBox": [-1.5,-1.5, 2.5, 2.5]
        }
        `);
        } else {
            t.push(`
        {
            "name": "Happy Stones",
            "boardImage": "https://raw.githubusercontent.com/upsided/Upsided-Sabaki-Themes/main/happy-stones/goban_texture_fancy_orange.png",
            "whiteStones": [
                "https://raw.githubusercontent.com/upsided/Upsided-Sabaki-Themes/main/happy-stones/glass_white.png"
            ],
            "blackStones": [
                "https://raw.githubusercontent.com/upsided/Upsided-Sabaki-Themes/main/happy-stones/glass_black.png"
            ],
            "sizes": [2],
            "offsets": [[0.41,0.41]],
            "stoneBoundingBox": [-1.5,-1.5, 2.5, 2.5]
        }
        `);
        }

        return t;
    }

    public static getDefaultJSON(): string {
        // an example until I figure out how to integrate JSONThemes in OGS
        // these examples are guaranteed to parse
        return JSONTheme.getStockThemes()[0];
    }
}

export function makeJSONTheme(jsonText: string, name: string): typeof JSONTheme {
    // manufacture a custom class for the given json
    // and return it
    return class CustomTheme extends JSONTheme {
        public json: string = jsonText;
        public name = name;
        get theme_name(): string {
            return this.name;
        }

        constructor(parent?: GoTheme) {
            super(parent);
            this.parent = parent;

            if (!this.themeStyle) {
                this.themeStyle = new JSONThemeStyle();
            }
            //console.log(`JSON for ${this.name}: `, this.json);

            if (this.json.length < 2) {
                // treating "{}" as legit theme... doesn't have name though...
                this.loadFromText(JSONTheme.getDefaultJSON());
            } else {
                this.loadFromText(this.json);
            }
        }
    };
}

export function insertJSONTheme(goThemes: GoThemesInterface, validJSONText: string) {
    // create a custom theme class based on validJSONText
    // and insert the theme class into goThemes
    const p = JSON.parse(validJSONText); // ok to throw error here because json needs to be valid

    if (!p.name) {
        p.name = "JSONTheme"; // kinda hacky, name needs to be unique
    }

    const t = makeJSONTheme(validJSONText, p.name);

    //console.log(`adding theme "${p.name}"`);

    // not quite sure how to handle JSONThemes that are
    // only boards or only stones, so do it hamfisted for now...
    if (p.name) {
        const tn = p.name;
        goThemes["black"][tn] = t;
        goThemes["white"][tn] = t;
        goThemes["board"][tn] = t;
    }
}

export default function (GoThemes: GoThemesInterface) {
    insertJSONTheme(GoThemes, JSONTheme.getDefaultJSON());
}
