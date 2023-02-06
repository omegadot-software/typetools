import type { Opaque } from "type-fest";

import { ITabularData } from "./ITabularData";
import { StrictArrayBuffer } from "./StrictArrayBuffer";

/**
 * Represents the binary type the way tabular data is stored on disk.
 */
export type ITabularDataBuffer = Opaque<StrictArrayBuffer, ITabularData>;
