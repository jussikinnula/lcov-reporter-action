import { th, tr, td, table, tbody, a, b, span, fragment } from "./html"

// Tabulate the lcov data in a HTML table.
export function tabulate(lcov, options) {
	const head = tr(
		th("File"),
		th("Statements"),
		th("Branches"),
		th("Functions"),
		th("Lines"),
		th("Uncovered Lines"),
	)

	const folders = {}
	for (const file of lcov) {
		const parts = file.file.replace(options.prefix, "").split("/")
		const folder = parts.slice(0, -1).join("/")
		folders[folder] = folders[folder] || []
		folders[folder].push(file)
	}

	const rows = Object.keys(folders)
		.sort()
		.reduce(
			(acc, key) => [
				...acc,
				toFolder(key, options),
				...folders[key].map(file => toRow(file, key !== "", options)),
			],
			[],
		)

	return table(tbody(head, ...rows))
}

function toFolder(path) {
	if (path === "") {
		return ""
	}

	return tr(td({ colspan: 5 }, b(path)))
}

function getStatement(file) {
	const { branches, functions, lines } = file;
	return [branches, functions, lines].reduce((prev, curr) => ({
		hit: prev.hit + (curr.hit || 0),
		found: prev.found + (curr.found || 0),
	}), {
		hit: 0,
		found: 0,
	})
}

function toRow(file, indent, options) {
	return tr(
		td(filename(file, indent, options)),
		td(percentage(getStatement(file), options)),
		td(percentage(file.branches, options)),
		td(percentage(file.functions, options)),
		td(percentage(file.lines, options)),
		td(uncovered(file, options)),
	)
}

function filename(file, indent, options) {
	const relative = file.file.replace(options.prefix, "")
	const href = `https://github.com/${options.repository}/blob/${options.commit}/${relative}`
	const parts = relative.split("/")
	const last = parts[parts.length - 1]
	const space = indent ? "&nbsp; &nbsp;" : ""
	return fragment(space, a({ href }, last))
}

function percentage(item) {
	if (!item) {
		return "N/A"
	}

	const value = item.found === 0 ? 100 : (item.hit / item.found) * 100
	const rounded = value.toFixed(2).replace(/\.0*$/, "")

	const tag = value === 100 ? fragment : b

	return tag(`${rounded}%`)
}

function uncovered(file, options) {
	const branches = (file.branches ? file.branches.details : [])
		.filter(branch => branch.taken === 0)
		.map(branch => branch.line)

	const lines = (file.lines ? file.lines.details : [])
		.filter(line => line.hit === 0)
		.map(line => line.line)

	const all = [...branches, ...lines].sort()

	return all
		.map(function(line) {
			const relative = file.file.replace(options.prefix, "")
			const href = `https://github.com/${options.repository}/blob/${options.commit}/${relative}#L${line}`
			return a({ href }, line)
		})
		.join(", ")
}
