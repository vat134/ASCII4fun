# UI primitives

shadcn/ui `base-nova` components, retrieved from the official registry on 2026-10-27.
Behavior is provided by `@base-ui/react`; product-specific UI belongs outside this directory.

Local adaptations: relative `cn` import, central Lucide icon imports, and removal of unused variant exports for React Fast Refresh. The registry's icon placeholder is resolved to Lucide's ChevronDown icon. Tabs leaves orientation and its data attribute to Base UI instead of consuming the prop without forwarding it.

Select and Tooltip use the corresponding Base Nova registry entries; unused separator/provider exports are omitted. Native Select was replaced because its platform popup cannot provide the accepted grouped appearance. Numeric editing composes Base UI Number Field with the existing Input through `render`, reusing styling without another primitive or dependency.

Keep this directory as the imported library baseline with the documented adaptations above. Use existing props and tokens in `../../styles.css` first. When product behavior needs an extension, create a component in `../components` that imports and composes the base primitive. Do not add product behavior to `ui/base`, duplicate its implementation, or create a forwarding wrapper without added behavior. Create an extension only when it has a current consumer.

The two orientation variants used by Slider and Tabs are inlined from [shadcn's Tailwind CSS](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/tailwind.css) into `../../styles.css`. This follows its eject approach without installing the CLI and unused utilities as a runtime styling dependency.

Slider keeps its 4 px track inside a 44 px horizontal Control so the full area accepts pointer input.

Source: <https://ui.shadcn.com/r/styles/base-nova/button.json> (equivalent URLs for the other components). License: MIT; see the repository's third-party notices.
