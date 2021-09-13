using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;

namespace Swaggie.Swashbuckle
{
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
      JsonConvert.DefaultSettings = () => new JsonSerializerSettings
      {
        // Automatically converts DotNetNames to jsFriendlyNames
        ContractResolver = new CamelCasePropertyNamesContractResolver()
      };

      services.AddControllers()
        .AddNewtonsoftJson(x =>
        {
          // Ignores potential reference loop problems
          x.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;

          // Serializes dotnet enums to strings (you can remove it if you prefer numbers instead)
          x.SerializerSettings.Converters.Add(new StringEnumConverter());
        });

      services.AddHttpContextAccessor();

      if (!_isProduction)
      {
        services.AddSwaggerGen(c =>
        {
          c.CustomOperationIds(e =>
            $"{e.ActionDescriptor.RouteValues["controller"]}_{e.ActionDescriptor.RouteValues["action"]}");
          c.SwaggerDoc("v1", new OpenApiInfo { Title = "Sample Api", Version = "v1" });
        });
        services.AddSwaggerGenNewtonsoftSupport();
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

      if (!_isProduction)
      {
        app.UseSwagger(c => c.SerializeAsV2 = true);
        app.UseSwaggerUI(c => { c.SwaggerEndpoint("v1/swagger.json", "Sample Api"); });
      }

      app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
    }
  }
}
