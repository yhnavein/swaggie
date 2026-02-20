using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Swaggie.Swashbuckle;

// ReSharper disable once ClassNeverInstantiated.Global
/// <summary>
/// Filter that fixes the way enums are generated into the OpenAPI schema
/// It will add an x-enumNames extension to the schema, which will contain the names of the enum values
/// </summary>
public class XEnumNamesSchemaFilter : ISchemaFilter
{
  public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
  {
    if (!context.Type.IsEnum)
    {
      return;
    }

    // In Microsoft.OpenApi v2, collections are not pre-initialized — always work via the
    // concrete OpenApiSchema so we can initialize and mutate Enum and Extensions.
    if (schema is not OpenApiSchema openApiSchema)
    {
      return;
    }

    var enumValues = Enum.GetValues(context.Type);
    var enumNames = Enum.GetNames(context.Type);

    // Re-populate Enum with integer values (clear any defaults first).
    openApiSchema.Enum ??= new List<JsonNode>();
    openApiSchema.Enum.Clear();
    foreach (var enumValue in enumValues)
    {
      openApiSchema.Enum.Add(JsonValue.Create((int)enumValue));
    }

    // Add x-enumNames vendor extension carrying the string names.
    // Extensions dict is also not initialized by default in Microsoft.OpenApi v2.
    var enumNamesArray = new JsonArray(
      enumNames.Select(name => JsonValue.Create(name)).ToArray<JsonNode?>()
    );
    openApiSchema.Extensions ??= new Dictionary<string, IOpenApiExtension>();
    openApiSchema.Extensions["x-enumNames"] = new JsonNodeExtension(enumNamesArray);
  }
}
