using System;
using System.Linq;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Swaggie.Swashbuckle;

// ReSharper disable once ClassNeverInstantiated.Global
/// <summary>
/// Filter that fixes the way enums are generated into the OpenAPI schema
/// It will add an x-enumNames extension to the schema, which will contain the names of the enum values
/// </summary>
public class XEnumNamesSchemaFilter : ISchemaFilter
{
  public void Apply(OpenApiSchema schema, SchemaFilterContext context)
  {
    if (context.Type.IsEnum)
    {
      schema.Enum.Clear();
      var enumValues = Enum.GetValues(context.Type);
      var enumNames = Enum.GetNames(context.Type);

      var enumNamesArray = new OpenApiArray();
      enumNamesArray.AddRange(enumNames.Select(name => new OpenApiString(name)));

      schema.Extensions.Add("x-enumNames", enumNamesArray);

      foreach (var enumValue in enumValues)
      {
        schema.Enum.Add(new OpenApiInteger((int)enumValue));
      }
    }
  }
}
