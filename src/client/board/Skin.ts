import { AtlasTexture, NineSliceTexture } from "./Texture";
import { EventEmitter } from "events";
import { Position } from "../../util/Position";

export class Skin extends EventEmitter {
  name: string;

  tiles: AtlasTexture;
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
    return [
      this.tiles,
      this.frame,
      this.counter,
      this.counterNumbers,
      this.button,
    ].every((s) => s.img.complete);
  }

  async load(name: string) {
    this.name = name;

    const config = await fetch(`/img/skins/${name}/config.json`).then((res) =>
      res.json(),
    );

    this.tiles = new AtlasTexture(`/img/skins/${name}/tiles.png`, 1, 14);
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
    this.button = new AtlasTexture(`/img/skins/${name}/button.png`, 1, 3);

    const onLoad = () => {
      if (this.loaded) this.emit("load");
    };

    onLoad();
    this.tiles.img.addEventListener("load", onLoad);
    this.frame.img.addEventListener("load", onLoad);
    this.counter.img.addEventListener("load", onLoad);
    this.counterNumbers.img.addEventListener("load", onLoad);
    this.button.img.addEventListener("load", onLoad);
  }
}
