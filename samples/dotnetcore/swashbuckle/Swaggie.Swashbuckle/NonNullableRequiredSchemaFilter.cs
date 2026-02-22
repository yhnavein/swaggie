using System;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Swaggie.Swashbuckle;

// ReSharper disable once ClassNeverInstantiated.Global
/// <summary>
/// Schema filter that adds non-nullable properties to the OpenAPI 'required' array.
///
/// Covers two categories:
///
/// 1. Non-nullable reference types (string, class, IList, etc.):
///    Swashbuckle's built-in SupportNonNullableReferenceTypes() only works when the C# compiler
///    emits explicit NullableAttribute IL metadata. This filter fills the gap by using
///    NullabilityInfoContext (System.Reflection) to inspect declared nullability at runtime.
///
/// 2. Non-nullable value types (double, int, bool, DateTime, etc. — but NOT double?, int?):
///    Newtonsoft.Json's contract resolver previously marked these as required automatically.
///    We restore that behaviour here: a plain 'double' field is always present in the JSON
///    (it serializes as 0.0 if unset), whereas 'double?' may serialize as null/absent.
/// </summary>
public class NonNullableRequiredSchemaFilter : ISchemaFilter
{
    private static readonly NullabilityInfoContext _nullabilityContext = new();

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type is null || schema is not OpenApiSchema openApiSchema)
            return;

        // Only process object schemas (class/struct types)
        if (!context.Type.IsClass && !context.Type.IsValueType)
            return;

        // Skip enums — they have no properties
        if (context.Type.IsEnum)
            return;

        openApiSchema.Required ??= new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in context.Type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var type = property.PropertyType;

            if (type.IsValueType)
            {
                // Nullable<T> (i.e. double?, int?, bool?) — skip, these are optional
                if (Nullable.GetUnderlyingType(type) != null)
                    continue;

                // Plain value type (double, int, bool, DateTime, enum, etc.) — always required
            }
            else
            {
                // Reference type: skip if explicitly marked nullable (Type?)
                var nullabilityInfo = _nullabilityContext.Create(property);
                if (nullabilityInfo.WriteState == NullabilityState.Nullable ||
                    nullabilityInfo.ReadState == NullabilityState.Nullable)
                    continue;
            }

            // Property is non-nullable — add its camelCase name to required
            var camelCaseName = char.ToLowerInvariant(property.Name[0]) + property.Name[1..];

            // Only add if the schema actually has this property listed
            if (openApiSchema.Properties != null && openApiSchema.Properties.ContainsKey(camelCaseName))
            {
                openApiSchema.Required.Add(camelCaseName);
            }
        }
    }
}
