# Backend Support

Swaggie is backend-agnostic. It reads a standard OpenAPI 3 spec file — YAML or JSON — and does not care which framework, language, or tool produced it. If it conforms to the spec, Swaggie will generate a typed client from it.

That said, **the quality of the generated client is only as good as the quality of the spec**. A poorly configured backend will emit an imprecise spec — missing required flags, incorrect nullability, wrong types for query parameters — and Swaggie will faithfully reflect those inaccuracies in the output. Garbage in, garbage out.

## ASP.NET Core

ASP.NET Core is a common backend pairing and, unfortunately, one where the out-of-the-box OpenAPI configuration needs serious adjustment before it produces a spec that client generators can work with reliably. The two most widely used spec generators for ASP.NET Core are **Swashbuckle** and **NSwag**.

The main problem areas with default settings:

- **Nullability** — without explicit configuration, most properties are treated as optional or nullable regardless of your C# types, leading to generated TypeScript types that are far too permissive.
- **Required fields** — non-nullable value types (`int`, `double`, `DateTime`) are often not marked as `required` in the schema, so the generated client treats them as optional.
- **Query parameter serialization** — complex query parameter types are frequently serialized incorrectly in the spec, producing client code that sends requests in a format the server won't understand.
- **Enum representation** — the default enum output varies between tools and often requires explicit configuration to produce string-based or integer-based enums consistently.

Both tools are capable of producing excellent specs — they just need to be configured correctly.

## Sample Projects

To save you the configuration work, two fully working reference projects are provided. Both target **ASP.NET Core 10** and are ready to run out of the box:

- **[Swashbuckle sample](https://github.com/yhnavein/swaggie/tree/master/samples/dotnetcore/swashbuckle)** — recommended for most projects. Includes a custom `NonNullableRequiredSchemaFilter` that correctly marks non-nullable value and reference types as required, and demonstrates how to auto-generate the spec file on every build (so you never need a running server to regenerate the client).

- **[NSwag sample](https://github.com/yhnavein/swaggie/tree/master/samples/dotnetcore/nswag)** — a working NSwag configuration. Note that if your API uses complex query parameter types, NSwag has a known limitation where its extensibility points do not reliably fix the serialization output. For those cases, Swashbuckle is the better choice.

::: tip Auto-generating the spec on build
The Swashbuckle sample includes a `PostBuild` MSBuild task that regenerates the OpenAPI JSON file every time the project is built. This means your spec is always in sync with your code, and Swaggie can be run in CI without needing a live server.
:::

## Swashbuckle vs NSwag

| | Swashbuckle | NSwag |
|---|---|---|
| Recommended for most projects | Yes | — |
| Complex query param types | With custom filter | Problematic |
| Auto-generate spec on build | Yes (PostBuild task) | Possible |
| .NET 10 + Microsoft.OpenApi v2 | Fully supported | Fully supported |

## .NET 10 and Nullability

If you are using the Swashbuckle sample on .NET 10, be aware of a breaking change introduced by Microsoft.OpenApi v2: the `Newtonsoft.Json` contract resolver no longer drives schema generation. The consequence is that without additional configuration, non-nullable types lose their `required` status and the spec becomes significantly less precise.

The sample project addresses this with two complementary measures:

1. **Enable `<Nullable>enable</Nullable>`** in your project file. This causes the compiler to emit nullability metadata into the assembly, which Swashbuckle can read via `SupportNonNullableReferenceTypes()`.
2. **Register `NonNullableRequiredSchemaFilter`** — a custom schema filter included in the sample that fills the remaining gap for non-nullable value types (`int`, `double`, `bool`, etc.), which NRT alone does not cover.

Together these ensure that what is non-nullable in C# is marked `required` and non-nullable in the spec, and what is nullable is marked accordingly — producing a TypeScript client where optional and required properties accurately reflect your API contract.
