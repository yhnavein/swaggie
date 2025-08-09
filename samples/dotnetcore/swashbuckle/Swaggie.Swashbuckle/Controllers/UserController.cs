using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Swaggie.Swashbuckle.Controllers;

[Route("user")]
public class UserController : Controller
{
  [HttpGet("")]
  [Produces(typeof(IList<UserViewModel>))]
  public IActionResult GetUsers([FromQuery] UserRole? role)
  {
    var allUsers = new[]
    {
      new UserViewModel
      {
        Name = "Ann Bobcat", Id = 1, Email = "ann.b@test.org", Role = UserRole.Admin
      },
      new UserViewModel
      {
        Name = "Bob Johnson", Id = 2, Email = "bob.j@test.org", Role = UserRole.User
      }
    };

    var users = allUsers
      .Where(u => role == null || u.Role == role)
      .ToList();

    return Ok(users);
  }

  [HttpGet("filter")]
  [Produces(typeof(FilterTestResponse))]
  public IActionResult TestFilters([FromQuery(Name = "filter")] UserFilter? filter, [FromQuery(Name = "secondFilter")] UserFilter? secondFilter, [FromQuery, Required] Dictionary<string, int> someDict)
  {
    Console.WriteLine("filter: " + JsonConvert.SerializeObject(filter));
    Console.WriteLine("secondFilter: " + JsonConvert.SerializeObject(secondFilter));
    Console.WriteLine("someDict: " + JsonConvert.SerializeObject(someDict));
    var result = new FilterTestResponse
    {
      filter = filter,
      secondFilter = secondFilter,
      someDict = someDict
    };

    return Ok(result);
  }

  [HttpPost("")]
  [ProducesResponseType(typeof(UserViewModel), StatusCodes.Status201Created)]
  public IActionResult CreateUser([FromBody] UserViewModel user)
  {
    return Created("some-url", user);
  }

  [HttpPost("avatar")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  [ProducesResponseType(StatusCodes.Status400BadRequest)]
  public IActionResult UploadAvatar(IFormFile file)
  {
    Console.WriteLine("avatar" + file);

    // Here you would typically save the file to a storage service
    // For demonstration, we'll just return the file size
    return Ok($"File uploaded successfully. Size: {file?.Length ?? 0} bytes");
  }

  [HttpPut("properties")]
  [Consumes("application/x-www-form-urlencoded")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  [ProducesResponseType(StatusCodes.Status400BadRequest)]
  public IActionResult UpdateUserProperties([FromForm] UserUpdateModel userUpdate)
  {
    Console.WriteLine("userUpdate: " + JsonConvert.SerializeObject(userUpdate));

    // Here you would typically update the user in your database
    return Ok($"User updated: Name = {userUpdate.Name}, Email = {userUpdate.Email}");
  }

  [HttpPost("profile")]
  [Consumes("multipart/form-data")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  [ProducesResponseType(StatusCodes.Status400BadRequest)]
  public IActionResult UpdateUserProfile([FromForm] UserProfileUpdateModel profileUpdate)
  {
    Console.WriteLine("profileUpdate: " + JsonConvert.SerializeObject(profileUpdate));

    // Here you would typically update the user's profile in your database
    return Ok($"Profile updated: Name = {profileUpdate.Name}, Bio = {profileUpdate.Bio}");
  }

  [HttpDelete("{id:long}")]
  [Produces(typeof(void))]
  public IActionResult DeleteUser([FromRoute] long id)
  {
    return NoContent();
  }
}

public class UserUpdateModel
{
  public string Name { get; set; }
  public string Email { get; set; }
}

public class UserProfileUpdateModel
{
  public string Name { get; set; }
  public string Bio { get; set; }
  public IFormFile Avatar { get; set; }
}

public class UserViewModel
{
  public string Name { get; set; }

  public long Id { get; set; }

  public string Email { get; set; }

  public UserRole Role { get; set; }

  [Required]
  public Dictionary<int, string> SomeDict { get; set; } = new();

  public PagedResult<string> AuditEvents { get; set; } = new();
}

public class UserFilter
{
  /// <summary>
  /// Name of the user. Can be partial name match
  /// </summary>
  public string Name { get; set; }

  /// <summary>
  /// Ids of the users
  /// </summary>
  public List<long> Ids { get; set; } = new();

  /// <summary>
  /// User's email. Can be partial match
  /// </summary>
  public string Email { get; set; }

  /// <summary>
  /// Search by user role(s)
  /// </summary>
  public List<UserRole> Roles { get; set; } = new();

  public UserLog UserLog { get; set; } = new();
}

public class PagedResult<T>
{
  public IList<T> Items { get; set; }

  public int TotalCount { get; set; }
}

public class UserLog
{
  /// <summary>
  /// Who created user. Can be partial name match
  /// </summary>
  public string CreatedBy { get; set; }

  /// <summary>
  /// From date for user creation
  /// </summary>
  public DateTime DateFrom { get; set; }

  /// <summary>
  /// End date for user creation
  /// </summary>
  public DateTime DateTo { get; set; }
}

public enum UserRole
{
  Admin = 0,
  User = 1,
  Guest = 2
}

public class FilterTestResponse
{
  public UserFilter? filter { get; set; }
  public UserFilter? secondFilter { get; set; }
  public Dictionary<string, int> someDict { get; set; }
}
