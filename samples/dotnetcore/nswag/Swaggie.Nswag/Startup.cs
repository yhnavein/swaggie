using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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

    services.AddControllers();

    services.AddHttpContextAccessor();

    if (!_isProduction)
    {
      services.AddOpenApiDocument(c =>
      {
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
      app.UseSwaggerUi(c =>
      {
        c.DocExpansion = "list";
        c.DefaultModelsExpandDepth = 1;
      });
      app.UseReDoc(c =>
      {
        c.Path = "/redoc";
      });

      // Redirect root to Swagger UI
      app.Use(async (context, next) =>
      {
        if (context.Request.Path.Value == "/")
        {
          context.Response.Redirect("/swagger");
          return;
        }
        await next();
      });
    }

    app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
  }
}
