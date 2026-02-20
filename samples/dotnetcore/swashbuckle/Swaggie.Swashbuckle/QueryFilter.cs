using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Microsoft.OpenApi;

namespace Swaggie.Swashbuckle;

// ReSharper disable once ClassNeverInstantiated.Global
/// <summary>
/// Filter that replaces original complex query parameters with the reference types instead
/// This will work only for OpenAPI 3.0 (as Swagger does not offer such functionality)
/// Without it, Swashbuckle will flatten objects into query parameters, which will effectively
/// break the contract with the API
/// </summary>
public class FromQueryModelFilter : IOperationFilter
{
  public void Apply(OpenApiOperation operation, OperationFilterContext context)
  {
    var description = context.ApiDescription;
    if (description.HttpMethod?.ToLower() != HttpMethod.Get.ToString().ToLower())
    {
      // We only want to do this for GET requests, if this is not a
      // GET request, leave this operation as is, do not modify
      return;
    }

    var actionParameters = description.ActionDescriptor.Parameters
      .Where(p => p.ParameterType != typeof(CancellationToken))
      .ToList();
    var apiParameters = description.ParameterDescriptions
      .Where(p => p.Source.IsFromRequest)
      .ToList();

    if (actionParameters.Count == apiParameters.Count)
    {
      // If no complex query parameters detected, leave this operation as is, do not modify
      return;
    }

    operation.Parameters = CreateParameters(actionParameters, operation.Parameters, context);
  }

  private List<IOpenApiParameter> CreateParameters(
    IList<ParameterDescriptor> actionParameters,
    IList<IOpenApiParameter> operationParameters,
    OperationFilterContext context)
  {
    var newParameters = actionParameters
      .Select(p => CreateParameter(p, operationParameters, context))
      .Where(p => p != null)
      .ToList();

    return newParameters.Count != 0 ? newParameters : null;
  }

  private static IOpenApiParameter CreateParameter(
    ParameterDescriptor actionParameter,
    IList<IOpenApiParameter> operationParameters,
    OperationFilterContext context)
  {
    var operationParamNames = operationParameters.Select(p => p.Name);
    if (operationParamNames.Contains(actionParameter.Name))
    {
      // If param is defined as the action method argument, just pass it through
      return operationParameters.First(p => p.Name == actionParameter.Name);
    }

    if (actionParameter.BindingInfo == null)
    {
      return null;
    }

    var generatedSchema =
      context.SchemaGenerator.GenerateSchema(actionParameter.ParameterType,
        context.SchemaRepository);

    return new OpenApiParameter
    {
      Name = actionParameter.Name,
      In = ParameterLocation.Query,
      Schema = generatedSchema,
      Explode = true,
      Style = ParameterStyle.Simple
    };
  }
}
