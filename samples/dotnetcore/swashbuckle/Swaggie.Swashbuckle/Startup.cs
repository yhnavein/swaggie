using System;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;

namespace Swaggie.Swashbuckle;

public class Startup
{
  private readonly bool _isProduction;

  public Startup(IWebHostEnvironment env)
  {
    _isProduction = env.IsProduction();
  }

  // This method gets called by the runtime. Use this method to add services to the container
  public void ConfigureServices(IServiceCollection services)
  {
    services.Configure<KestrelServerOptions>(options => { options.AllowSynchronousIO = true; });

    services.ConfigureHttpJsonOptions(opts =>
    {
      opts.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
      opts.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault;
    });

    services.AddControllers();

    services.AddHttpContextAccessor();

    if (!_isProduction)
    {
      services.AddEndpointsApiExplorer();
      services.AddSwaggerGen(c =>
      {
        c.SchemaGeneratorOptions.UseOneOfForPolymorphism = true;
        c.SupportNonNullableReferenceTypes();
        c.SchemaFilter<NonNullableRequiredSchemaFilter>();
        c.OperationFilter<FromQueryModelFilter>();
        c.SchemaFilter<XEnumNamesSchemaFilter>();
        c.CustomOperationIds(e =>
          $"{e.ActionDescriptor.RouteValues["controller"]}_{e.ActionDescriptor.RouteValues["action"]}");
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Sample Api", Version = "v1" });

        // Add XML comments from the main assembly
        var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        c.IncludeXmlComments(xmlPath);
      });
    }
  }

  // This method gets called by the runtime. Use this method to configure the HTTP request pipeline
  public void Configure(IApplicationBuilder app, IWebHostEnvironment env,
    IHostApplicationLifetime appLifetime)
  {
    if (!_isProduction)
    {
      app.UseDeveloperExceptionPage();
    }

    app.UseRouting();
    app.UseCors(c =>
    {
      c.AllowAnyHeader()
        .AllowAnyMethod()
        .AllowAnyOrigin();
    });

    if (!_isProduction)
    {
      app.UseSwagger(options => { options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1; });
      app.UseSwaggerUI(c =>
      {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sample Api");
        c.RoutePrefix = "swagger";
      });
    }

    app.UseEndpoints(endpoints =>
    {
      endpoints.MapControllers();
      endpoints.MapSwagger();
    });
  }
}
