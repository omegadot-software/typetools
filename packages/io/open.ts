import { open as _open } from "fs";
import { promisify } from "util";

export const open = promisify(_open);