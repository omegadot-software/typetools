import { rename as rename_ } from "fs";
import { promisify } from "util";

export const rename = promisify(rename_);
