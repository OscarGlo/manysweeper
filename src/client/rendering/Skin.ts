import { AtlasTexture, NineSliceTexture } from "./Texture";

export class Skin {
  tiles: AtlasTexture;
  frame: NineSliceTexture;
  counter: NineSliceTexture;
  counterNumbers: AtlasTexture;
  button: AtlasTexture;

  loaded: boolean = false;

  constructor(name: string) {
    this.load(name);
  }

  async load(name: string) {
    const config = await fetch(`img/skins/${name}/config.json`).then((res) =>
      res.json(),
    );

    const tiles = new AtlasTexture(`img/skins/${name}/tiles.png`, 1, 14);
    const frame = new NineSliceTexture(
      `img/skins/${name}/frame.png`,
      config.frame.top,
      config.frame.bottom,
      config.frame.left,
      config.frame.right,
    );
    const counter = new NineSliceTexture(
      `img/skins/${name}/counter.png`,
      config.counter.top,
      config.counter.bottom,
      config.counter.left,
      config.counter.right,
    );
    const counterNumbers = new AtlasTexture(
      `img/skins/${name}/counter_numbers.png`,
      1,
      11,
    );
    const button = new AtlasTexture(`img/skins/${name}/button.png`, 1, 3);

    let loadCount = 0;
    const onLoad = () => {
      if (++loadCount === 5) {
        this.tiles = tiles;
        this.frame = frame;
        this.counter = counter;
        this.counterNumbers = counterNumbers;
        this.button = button;

        this.loaded = true;
      }
    };

    tiles.img.addEventListener("load", onLoad);
    frame.img.addEventListener("load", onLoad);
    counter.img.addEventListener("load", onLoad);
    counterNumbers.img.addEventListener("load", onLoad);
    button.img.addEventListener("load", onLoad);
  }
}
