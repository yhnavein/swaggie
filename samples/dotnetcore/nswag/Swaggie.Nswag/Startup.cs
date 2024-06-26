using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;

namespace Swaggie.Nswag;

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
      services.AddSwaggerDocument(c =>
      {
        // c.GenerateEnumMappingDescription = true;
        c.PostProcess = document =>
        {
          document.Info.Version = "v1";
          document.Info.Title = "Sample Api";
        };
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

    if (!_isProduction)
    {
      app.UseOpenApi();
      app.UseSwaggerUi3(c =>
      {
        c.Path = "/swagger";
        c.DocumentPath = "/swagger/v1/swagger.json";
      });
    }

    app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
  }
}
