import fs from "fs";
import gulp from "gulp";
import gulpTypescript from "gulp-typescript";
import gulpUglify from "gulp-uglify";
import webpackStream from "webpack-stream";
import webpackConfig from "./webpack.config.js";

const TSCONFIG_JSON: string = "tsconfig.json";
let tsConfig: any;

try {
	tsConfig = JSON.parse(fs.readFileSync(TSCONFIG_JSON).toString())
} catch (ex) {
	console.log(ex.message);
	process.exit(1);
}

const TS_PROJECT: gulpTypescript.Project = gulpTypescript.createProject(TSCONFIG_JSON);
const DIR_OUT: string = tsConfig.compilerOptions.outDir;

export default build;

export async function build(): Promise<NodeJS.ReadWriteStream> {
	return TS_PROJECT.src().pipe(TS_PROJECT()).js.pipe(gulpUglify()).pipe(webpackStream(webpackConfig)).pipe(gulp.dest(DIR_OUT));
}
