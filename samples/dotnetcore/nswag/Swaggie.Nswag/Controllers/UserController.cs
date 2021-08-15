using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Swaggie.Nswag.Controllers
{
  [Route("user")]
  public class UserController : Controller
  {
    [HttpGet("")]
    [Produces(typeof(IList<UserViewModel>))]
    public IActionResult GetUsers()
    {
      var users = new[]
      {
        new UserViewModel()
        {
          Name = "Ann Bobcat", Id = 1, Email = "ann.b@test.org", Role = UserRole.Admin
        },
        new UserViewModel()
        {
          Name = "Bob Johnson", Id = 2, Email = "bob.j@test.org", Role = UserRole.User
        }
      };

      return Ok(users);
    }

    [HttpPost("")]
    [ProducesResponseType(typeof(UserViewModel), StatusCodes.Status201Created)]
    public IActionResult CreateUser([FromBody]UserViewModel user)
    {
      return Created("some-url", user);
    }

    [HttpDelete("{id}")]
    [Produces(typeof(void))]
    public IActionResult DeleteUser([FromRoute]long id)
    {
      return NoContent();
    }
  }

  public class UserViewModel
  {
    public string Name { get; set; }

    public long Id { get; set; }

    public string Email { get; set; }

    public UserRole Role { get; set; }
  }

  public enum UserRole
  {
    Admin = 0,
    User = 1,
    Guest = 2
  }
}
