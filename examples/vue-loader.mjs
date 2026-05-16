import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';
import { transformSync } from 'esbuild';

export const load = async (url, context, nextLoad) => {
	if (!url.endsWith('.vue')) {
		return nextLoad(url, context);
	}

	const filePath = fileURLToPath(url);
	const source = await readFile(filePath, 'utf8');
	const { descriptor } = parse(source, { filename: filePath });
	const id = filePath;

	const scriptResult = compileScript(descriptor, {
		id,
		inlineTemplate: false,
		genDefaultAs: '__sfc__',
	});

	const scriptLang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang;
	const isTs = scriptLang === 'ts' || scriptLang === 'tsx';

	const scriptCode = isTs
		? transformSync(scriptResult.content, {
				loader: scriptLang,
				format: 'esm',
				target: 'es2022',
				sourcefile: filePath,
			}).code
		: scriptResult.content;

	let templateCode = '';
	if (descriptor.template) {
		const tpl = compileTemplate({
			source: descriptor.template.content,
			filename: filePath,
			id,
			scoped: false,
			isProd: false,
			compilerOptions: { bindingMetadata: scriptResult.bindings },
		});
		templateCode = tpl.code.replace('export function render', 'function render');
		templateCode += '\n__sfc__.render = render;\n';
	}

	const code = `${scriptCode}\n${templateCode}\nexport default __sfc__;\n`;

	return { format: 'module', shortCircuit: true, source: code };
};
