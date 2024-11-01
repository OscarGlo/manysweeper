import { AtlasTexture, NineSliceTexture } from "./Texture";
import { EventEmitter } from "events";
import { Position } from "../../util/Position";

export class Skin extends EventEmitter {
  name: string;
  loading: boolean;

  tiles: AtlasTexture;
  tilesHex?: AtlasTexture;
  tilesTri?: AtlasTexture;
  tilesTri2?: AtlasTexture;
  frame: NineSliceTexture;
  counter: NineSliceTexture;
  counterNumbers: AtlasTexture;
  button: AtlasTexture;

  minesPos: Position;
  buttonPos: Position;
  buttonScale: number;
  timerPos: Position;

  constructor(name: string) {
    super();
    this.load(name);
  }

  get loaded(): boolean {
    if (this.loading) return false;

    const toLoad = [
      this.tiles,
      this.frame,
      this.counter,
      this.counterNumbers,
      this.button,
    ];
    if (this.tilesHex != null) toLoad.push(this.tilesHex);
    if (this.tilesTri != null) toLoad.push(this.tilesTri, this.tilesTri2);

    return toLoad.every((s) => s.img.complete);
  }

  async load(name: string) {
    this.name = name;
    this.loading = true;

    const config = await fetch(`/img/skins/${name}/config.json`).then((res) =>
      res.json(),
    );

    this.tiles = new AtlasTexture(`/img/skins/${name}/tiles.png`, 1, 15);

    this.tilesHex =
      config.variants && config.variants.includes("hex")
        ? new AtlasTexture(`/img/skins/${name}/tiles_hex.png`, 1, 13)
        : null;

    this.tilesTri =
      config.variants && config.variants.includes("tri")
        ? new AtlasTexture(`/img/skins/${name}/tiles_tri.png`, 1, 19)
        : null;
    this.tilesTri2 =
      config.variants && config.variants.includes("tri")
        ? new AtlasTexture(`/img/skins/${name}/tiles_tri2.png`, 1, 19)
        : null;

    this.frame = new NineSliceTexture(
      `/img/skins/${name}/frame.png`,
      config.frame.top,
      config.frame.bottom,
      config.frame.left,
      config.frame.right,
      config.frame.scale,
    );
    this.minesPos = new Position(config.mines);
    this.timerPos = new Position(config.timer);
    this.buttonPos = new Position(config.button);
    this.buttonScale = config.button.scale ?? 1;
    this.counter = new NineSliceTexture(
      `/img/skins/${name}/counter.png`,
      config.counter.top,
      config.counter.bottom,
      config.counter.left,
      config.counter.right,
      config.counter.scale,
    );
    this.counterNumbers = new AtlasTexture(
      `/img/skins/${name}/counter_numbers.png`,
      1,
      11,
    );
    this.button = new AtlasTexture(`/img/skins/${name}/button.png`, 1, 4);

    this.loading = false;

    const onLoad = () => {
      if (this.loaded) {
        this.emit("load");
      }
    };

    onLoad();
    this.tiles.img.addEventListener("load", onLoad);
    this.tilesHex?.img?.addEventListener("load", onLoad);
    this.tilesTri?.img?.addEventListener("load", onLoad);
    this.tilesTri2?.img?.addEventListener("load", onLoad);
    this.frame.img.addEventListener("load", onLoad);
    this.counter.img.addEventListener("load", onLoad);
    this.counterNumbers.img.addEventListener("load", onLoad);
    this.button.img.addEventListener("load", onLoad);
  }
}
